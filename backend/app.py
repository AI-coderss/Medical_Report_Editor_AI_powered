from flask import Flask, request, jsonify, make_response
from openai import OpenAI
from flask_cors import CORS
import os
from dotenv import load_dotenv
import fitz
from mongoengine import connect, Document, StringField, FileField, ValidationError, ListField ,DateTimeField ,IntField
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, create_refresh_token
import re
import bcrypt
from pymongo import MongoClient
from bson import ObjectId 
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
import base64
from werkzeug.utils import secure_filename
import os
import tempfile
from datetime import datetime ,timedelta
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.vectorstores import Qdrant as QdrantVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
import qdrant_client
from flask import Response, stream_with_context
from uuid import uuid4

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Enable CORS for frontend communication (React running on localhost:3000)

# CORS(app, resources={r"/*": {"origins": "https://medical-report-editor-ai-powered-dsah.onrender.com/"}}, supports_credentials=True)

# CORS(app, resources={r"/*": {
#     "origins": "https://medical-report-editor-ai-powered-dsah.onrender.com",
#     "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#     "allow_headers": ["Content-Type", "Authorization"],
#     "supports_credentials": True
# }})
# CORS(app)
# CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://medical-report-editor-ai-powered-dsah.onrender.com"]}})
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)



# MongoDB Connection (Using Connection String)
MONGO_URI = "mongodb+srv://medical_reports:medical_reports@cluster0.1bbim.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
connect(db="medical_reports_db", host=MONGO_URI)

# Get
# OpenAI API key from .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key not found. Please set it in the .env file.")

engineeredprompt = """
You are an expert medical editor with deep knowledge of clinical documentation, medical terminology, and structured reporting.

Use the following **retrieved context** from similar medical documents to guide your edits and enhance the report:
{context}

Your task is to refine and improve the following medical report while ensuring:
- Grammatical accuracy
- Professional tone
- Adherence to standard medical documentation formats.
- Show the patient name and age at the top of the report like this:  
  Patient Name - {patient_name}, Patient Age - {patient_age}

- At the end of the report, add the following line:  
  This report was electronically signed by Doctor - {doctor_name}, Department - {department}.

**Formatting Instructions:**
- **The report title should be bold and centered.**
- **All report section headers (Chief Complaint, HPI, etc.) should be bold.**
- **The main content should be normal text (not bold).**
- **Use professional medical terminology throughout.**

{input_text}
"""

report_generation_prompt = """
You are an AI medical assistant. Generate a **well-structured** and **professionally formatted** medical report using the following inputs:

**Patient Information:**
- Name: {patient_name}
- Age: {patient_age}
- File Number: {file_number}

**Chief Complaint:**
{chief_complaint}

**History of Present Illness:**
{present_illness}

**Medical History:**
{medical_history}

**Past History:**
{past_history}

**Personal History:**
{personal_history}

**Family History:**
{family_history}

**System Review:**
{system_review}

**Relevant Context from Similar Cases:**
{context}

This report was electronically signed by Doctor - {doctor_name}, Department - {department}.

**Formatting Instructions:**
- Use professional medical terminology
- Structure the report with clear sections
- Ensure clinical accuracy
- Maintain consistent formatting
"""

app.config['JWT_SECRET_KEY'] = 'my-super-secret-key-12345' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# Directory to store uploaded files (e.g., doctor's signature)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'} 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Vector Store
def get_vector_store():
    qdrant = qdrant_client.QdrantClient(
        url=os.getenv("QDRANT_HOST"),
        api_key=os.getenv("QDRANT_API_KEY"),
        timeout=60.0
    )
    embeddings = OpenAIEmbeddings()
    return QdrantVectorStore(
        client=qdrant,
        collection_name=os.getenv("QDRANT_COLLECTION_NAME"),
        embeddings=embeddings
    )

vector_store = get_vector_store()

# Retriever Chain
def get_context_retriever_chain():
    llm = ChatOpenAI()
    retriever = vector_store.as_retriever()
    prompt = ChatPromptTemplate.from_messages([
        MessagesPlaceholder("chat_history"),
        ("user", "{input}"),
        ("user", "Based on this, generate a search query for retrieving relevant medical context.")
    ])
    return create_history_aware_retriever(llm, retriever, prompt)

# RAG Chain
def get_conversational_rag_chain():
    retriever_chain = get_context_retriever_chain()
    llm = ChatOpenAI(streaming=True)
    prompt = ChatPromptTemplate.from_messages([
        ("system", engineeredprompt),
        MessagesPlaceholder("chat_history"),
        ("user", "{input}")
    ])
    return create_retrieval_chain(
        retriever_chain,
        create_stuff_documents_chain(llm, prompt)
    )

def get_report_generation_chain():
    retriever_chain = get_context_retriever_chain()
    llm = ChatOpenAI(streaming=True)
    
    # Update the prompt to include context
    prompt = ChatPromptTemplate.from_messages([
        ("system", report_generation_prompt),
        MessagesPlaceholder("chat_history"),
        ("user", "{input}")
    ])
    
    # Create the document chain with the correct variable name
    document_chain = create_stuff_documents_chain(
        llm,
        prompt,
        document_variable_name="context"  # Explicitly set the context variable name
    )
    
    return create_retrieval_chain(
        retriever_chain,
        document_chain
    )

report_generation_chain = get_report_generation_chain()

# Initialize the RAG chain globally
conversation_rag_chain = get_conversational_rag_chain()

# Chat session history (in memory)
chat_sessions = {}

# User Model
class User(Document):
    firstName = StringField(required=True)
    lastName = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    department = StringField()
    status = IntField(default=1)
    
# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Medical Report Model
class MedicalReport(Document):
    patient_name = StringField(max_length=100)
    age = StringField(max_length=10)
    fileNumber = StringField(max_length=100)
    personal_history = StringField()
    chief_complaint = StringField()
    present_illness = StringField()
    medical_history = StringField()
    past_history = StringField()
    family_history = StringField()
    system_review = StringField()
    compiled_report = StringField()
    # doctor_signature = FileField()
    generatedBy = StringField(required=True)   
    department = StringField()
    doctor_name = StringField()
    date_of_report = DateTimeField(default=datetime.utcnow)
    doctor_id = StringField(required=True)
# class Editor(Document):
#     text = StringField(required=True)
#     result = StringField(required=True)
# class Editor(Document):
#     result = StringField(required=True)
#     meta = {'collection': 'corrected_reports'}
class Editor(Document):
    result = StringField(required=True)
    date_of_report = DateTimeField(default=datetime.utcnow)
    doctor_id = StringField(required=True)
    patient_name = StringField(required=True)
    patient_age = StringField(required=True)
    fileNumber = StringField(required=True) 
    generatedBy = StringField(required=True)   
    department = StringField()
    doctor_name = StringField() 
    meta = {'collection': 'Editor_reports'}

def validate_email(email):
    regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(regex, email)

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def check_password(password, hashed):
    """Check if a password matches the hashed password"""
    try:
        if isinstance(hashed, str):
            hashed = hashed.encode('utf-8')
    except AttributeError:
        pass  # hashed is already bytes
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

# Register Endpoint with Confirm Password
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    firstName = data.get('firstName')
    lastName = data.get('lastName')
    email = data.get('email')
    password = data.get('password')
    confirmPassword = data.get('confirmPassword')
    department = data.get('department')  

    # Check for missing fields
    if not all([firstName, lastName, email, password, confirmPassword]):
        return jsonify({'error': 'Missing fields'}), 400

    # Validate email format
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Check if email already exists
    if User.objects(email=email):
        return jsonify({'error': 'Email already exists'}), 400

    # Validate password confirmation
    if password != confirmPassword:
        return jsonify({'error': 'Passwords do not match'}), 400

    # Hash the password before saving
    hashed_password = hash_password(password)
    user = User(firstName=firstName, lastName=lastName, email=email, password=hashed_password, department=department)
    user.save()

    # Return response (excluding password for security)
    return jsonify({
        'id': str(user.id),
        'firstName': user.firstName,
        'lastName': user.lastName,
        'email': user.email,
        'department' : user.department,
        'message': 'User registered successfully'
    }), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400

    # Fetch the user by email
    user = User.objects(email=email).first()

    # Validate user existence, status, and password
    if not user or user.status != 1 or not check_password(password, user.password):
        return jsonify({'error': 'Invalid email, password, or inactive account'}), 401

    # Create JWT tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    # Prepare the response with user details
    response = make_response(jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': str(user.id),
            'firstName': user.firstName,
            'lastName': user.lastName,
            'email': user.email,
            'department': user.department
        }
    }), 200)

    # Set the refresh token in HttpOnly cookie
    response.set_cookie(
        'token', 
        refresh_token, 
        httponly=True, 
        secure=True, 
        samesite='Strict'
    )

    return response

# Get Specific User

@app.route('/user/<id>', methods=['GET'])
@jwt_required()
def get_user(id):
    user = User.objects(id=id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'first_name': user.firstName,
        'last_name': user.lastName,
        'email': user.email
    })

# Get All Users
@app.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.objects()
    return jsonify([{
        'id': str(user.id),
        'first_name': user.firstName,
        'last_name': user.lastName,
        'email': user.email,
        'status':user.status
    } for user in users])
    
# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/user/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        # Get the current user's ID from JWT
        current_user_id = get_jwt_identity()

        # Check if the user is authorized to update this profile
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized to update this user'}), 403

        # Find the user
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get data from request (supporting both JSON and form data)
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        # Get fields to update (all optional)
        first_name = data.get('firstName')
        last_name = data.get('lastName')
        
        # Prepare update fields
        update_fields = {}
        if first_name:
            update_fields['set__firstName'] = first_name
        if last_name:
            update_fields['set__lastName'] = last_name

        # If no fields to update, return error
        if not update_fields:
            return jsonify({'error': 'No valid fields provided for update'}), 400

        # Update the user
        user.update(**update_fields)
        user.reload()

        # Return updated user data (excluding password)
        return jsonify({
            'message': 'User updated successfully',
            'id': str(user.id),
            'firstName': user.firstName,
            'lastName': user.lastName,
        }), 200

    except ValidationError as e:
        return jsonify({'error': 'Validation error: ' + str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete User Endpoint
@app.route('/delete/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        # Find the user
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Toggle the status
        user.status = 0 if user.status == 1 else 1
        user.save()

        # Return success response
        return jsonify({
            'message': f"User status updated to {user.status}",
            'id': user_id
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
# @app.route("/api/medical-report", methods=["POST"])
# @jwt_required()
# def create_medical_report():
#     try:
#         # Extract form fields from request.form (not request.json)
#         patient_name = request.form.get("patientName")
#         age = request.form.get("age")
#         chief_complaint = request.form.get("chiefComplaint")
#         history_of_present_illness = request.form.get("historyOfPresentIllness")
#         past_medical_history = request.form.get("pastMedicalHistory")
#         family_history = request.form.get("familyHistory")
#         medications = request.form.get("medications")
#         allergies = request.form.get("allergies")
#         review_of_systems = request.form.get("reviewOfSystems")
#         physical_examination = request.form.get("physicalExamination")
#         investigations = request.form.get("investigations")
#         assessment_plan = request.form.get("assessmentPlan")

#         # Handle signature file upload
#         if "doctorSignature" not in request.files:
#             return jsonify({"error": "No doctor signature file provided"}), 400

#         file = request.files["doctorSignature"]
#         if file.filename == "":
#             return jsonify({"error": "No file selected"}), 400

#         if not allowed_file(file.filename):
#             return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

#         # Secure the filename and save it
#         filename = secure_filename(file.filename)
#         file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
#         file.save(file_path)

#         # Save report in MongoDB
#         report = MedicalReport(
#             patient_name=patient_name,
#             age=age,
#             chief_complaint=chief_complaint,
#             history_of_present_illness=history_of_present_illness,
#             past_medical_history=past_medical_history,
#             family_history=family_history,
#             medications=medications,
#             allergies=allergies,
#             review_of_systems=review_of_systems,
#             physical_examination=physical_examination,
#             investigations=investigations,
#             assessment_plan=assessment_plan,
#         )

#         # Store signature file in MongoDB GridFS
#         with open(file_path, "rb") as f:
#             report.doctor_signature.put(f, content_type=file.content_type)

#         report.save()

#         # Optionally, remove the file from the local server
#         os.remove(file_path)

#         return jsonify(
#             {
#                 "message": "Medical report created successfully",
#                 "patient_name": report.patient_name,
#                 "age": report.age,
#                 "chief_complaint": report.chief_complaint,
#                 "id": str(report.id),
#             }
#         ), 201



#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

#Update API
@app.route('/medical-report/<report_id>', methods=['PUT'])
@jwt_required()
def update_medical_report(report_id):
    try:
        # Check if the report exists
        report = MedicalReport.objects(id=report_id).first()
        if not report:
            return jsonify({'error': 'Medical report not found'}), 404

        # Check if the request contains form data or JSON
        if request.is_json:
            data = request.get_json()
            result = data.get('result')
        else:
            result = request.form.get('result')

        # Validate the result field
        if not result:
            return jsonify({'error': 'Result field is required'}), 400

        # Update the result field
        report.update(set__result=result)

        # Reload the updated report to confirm changes
        report.reload()

        # Return success response
        return jsonify({
            'message': 'Medical report updated successfully',
            'id': str(report.id),
            'patient_name': report.patient_name,
            'result': report.result
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get All Medical Reports (Patients)
@app.route('/reports', methods=['GET'])
# @jwt_required()
def get_reports():
    try:
        reports = MedicalReport.objects()
        report_list = []

        for report in reports:
            signature_data = None
            if report.doctor_signature:
                signature_data = base64.b64encode(report.doctor_signature.read()).decode('utf-8')

            report_dict = {
            "id": str(report.id),
            "patient_name": report.patient_name,
            "age": report.age,
            "fileName":report.fileNumber,
            "personal_history": report.personal_history,
            "chief_complaint": report.chief_complaint,
            "present_illness": report.present_illness,
            "medical_history": report.medical_history,
            "past_history": report.past_history,
            "family_history": report.family_history,
            "system_review": report.system_review,
            "date_of_report": report.date_of_report,
            "doctor_id": report.doctor_id,
            "doctor_name": report.doctor_name,
            "department": report.department,
            "compiled_report": report.compiled_report,
            }

            report_list.append(report_dict)

        return jsonify(report_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    #Get specific Medical Report
@app.route('/report/<id>', methods=['GET'])
@jwt_required()
def get_report(id):
    report = MedicalReport.objects(id=id).first()
    if not report:
        return jsonify({'error': 'report not found'}), 404
    
    return jsonify({
            "id": str(report.id),
            "patient_name": report.patient_name,
            "age": report.age,
            "chief_complaint": report.chief_complaint,
            "history_of_present_illness": report.history_of_present_illness,
            "past_medical_history": report.past_medical_history,
            "family_history": report.family_history,
            "medications" : report.medications,
            "allergies": report.allergies,
            "review_of_systems": report.review_of_systems,
            "physical_examination": report.physical_examination,
            "investigations": report.investigations,
            "assessment_plan": report.assessment_plan,
            "doctor_signature" : report.doctor_signature,
    })

# Delete Medical Report Endpoint
@app.route('/report-delete/<report_id>', methods=['DELETE'])
@jwt_required()
def delete_medical_report(report_id):
    try:
        # Find the medical report
        report = MedicalReport.objects(id=report_id).first()
        if not report:
            return jsonify({'error': 'Medical report not found'}), 404

        # Delete the report
        report.delete()

        # Return success response
        return jsonify({
            'message': 'Medical report deleted successfully',
            'id': report_id
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/editor-report-delete/<report_id>', methods=['DELETE'])
@jwt_required()
def delete_editor_report(report_id):
    try:
        # Find the editor report
        report = Editor.objects(id=report_id).first()
        if not report:
            return jsonify({'error': 'Editor report not found'}), 404

        # Delete the report
        report.delete()

        # Return success response
        return jsonify({
            'message': 'Editor report deleted successfully',
            'id': report_id
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ✅ 1️⃣ Corrects and improves the report (Original functionality)
@app.route('/correct-text', methods=['POST'])
@jwt_required()
def correct_text():
    try:
        data = request.get_json()
        input_text = data.get("text", "")
        patient_name = data.get("patient_name", "").strip()
        fileNumber = data.get("patient_fileNumber", "").strip()
        patient_age = data.get("patient_age", "").strip()
        doctor_name = data.get("doctor_name", "Dr.Test").strip()
        department = data.get("department", "Department-Test").strip()

        if not patient_name or not fileNumber:
            return jsonify({"error": "Patient name and File Number are required."}), 400

        if not input_text.strip():
            return jsonify({"error": "Empty text provided"}), 400

        structured_prompt = f"""
        You are an expert medical editor with deep knowledge of clinical documentation, medical terminology, and structured reporting.
        Your task is to refine and improve the following medical report while ensuring:
        - Grammatical accuracy
        - Professional tone
        - Adherence to standard medical documentation formats.
        - Show the patinet name and age at the top of the report like this 
            Patient Name - {patient_name} , Patient Age - {patient_age}

        - Also at the end of the report i want you to write this following 
         This report was electronically signed by Doctor - {doctor_name} , Depratment- {department} .

        **Formatting Instructions:**
        - **The report title should be bold and centered.**
        - **All report section headers (Chief Complaint, HPI, etc.) should be bold.**
        - **The main content should be normal text (not bold).**
        - **Use professional medical terminology throughout.**

        {input_text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": structured_prompt}]
        )

        corrected_text = response.choices[0].message.content.strip()
        doctor_id = get_jwt_identity()
        editor_entry = Editor(
            result=corrected_text,
            doctor_id=doctor_id,
            date_of_report=datetime.utcnow(),
            patient_name=patient_name,
            patient_age=patient_age,
            fileNumber=fileNumber,
            doctor_name=doctor_name,
            department=department,
            generatedBy="Editor Page"
        )
        editor_entry.save()


        # Return response
        return jsonify({
            "corrected_text": corrected_text,
            "record_id": str(editor_entry.id)
        })
        # return jsonify({"corrected_text": corrected_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/correct-text-stream', methods=['POST'])
@jwt_required()
def correct_text_stream():
    data = request.get_json()
    input_text = data.get("text", "")
    patient_name = data.get("patient_name", "").strip()
    fileNumber = data.get("patient_fileNumber", "").strip()
    patient_age = data.get("patient_age", "").strip()
    doctor_name = data.get("doctor_name", "Dr.Test").strip()
    department = data.get("department", "Department-Test").strip()

    if not input_text or not patient_name or not fileNumber:
        return jsonify({"error": "Missing required fields"}), 400

    session_id = str(uuid4())
    chat_sessions[session_id] = []

    def generate():
        answer = ""
        try:
            # Prepare the full input with all required variables
            full_input = {
                "input_text": input_text,
                "patient_name": patient_name,
                "patient_age": patient_age,
                "doctor_name": doctor_name,
                "department": department,
                "chat_history": chat_sessions[session_id],
                "input": input_text  # Also include as 'input' for the retriever
            }
            
            for chunk in conversation_rag_chain.stream(full_input):
                token = chunk.get("answer", "")
                answer += token
                yield token
                
        except Exception as e:
            yield f"\n[Error: {str(e)}]"

        # Save to DB
        doctor_id = get_jwt_identity()
        editor_entry = Editor(
            result=answer.strip(),
            doctor_id=doctor_id,
            date_of_report=datetime.utcnow(),
            patient_name=patient_name,
            patient_age=patient_age,
            fileNumber=fileNumber,
            doctor_name=doctor_name,
            department=department,
            generatedBy="Editor Page"
        )
        editor_entry.save()

    return Response(stream_with_context(generate()), content_type='text/plain')


@app.route('/editor-report', methods=['GET'])
@jwt_required()
def editor_report():
    doctor_id = get_jwt_identity()
    reports = Editor.objects(doctor_id=doctor_id)
    
    if not reports:
        return jsonify({"message": "No report found for this doctor"}), 404
    
    data_list = []  # Define data_list here
    
    for item in reports:
        data_list.append({
            "id":str(item.id),
            "result": item.result,
            "date_of_report": item.date_of_report,
        })
    
    return jsonify(data_list), 200

@app.route('/all-editor-report', methods=['GET'])
@jwt_required()
def all_editor_report():
    reports = Editor.objects()
    
    if not reports:
     return jsonify({"message": "No report found for this doctor"}), 404
    
    data_list = []  # Define data_list here
    
    for item in reports:
        data_list.append({
            "id":str(item.id),
            "result": item.result,
            "patient_name": item.patient_name,
            "patient_age": item.patient_age,       
            "fileNumber": item.fileNumber,
            "generatedBy":item.generatedBy,
            "doctor_name": item.doctor_name,
            "department": item.department,
            "date_of_report": item.date_of_report
        })
    
    return jsonify(data_list), 200



# ✅ 1️⃣ Corrects and improves the report (Original functionality)
# @app.route('/correct-text', methods=['POST'])
# def correct_text():
#     try:
#         data = request.get_json()
#         input_text = data.get("text", "")

#         if not input_text.strip():
#             return jsonify({"error": "Empty text provided"}), 400

#         structured_prompt = f"""
#         You are an expert medical editor with deep knowledge of clinical documentation, medical terminology, and structured reporting.
#         Your task is to refine and improve the following medical report while ensuring:
#         - Grammatical accuracy
#         - Professional tone
#         - Adherence to standard medical documentation formats.

#         **Formatting Instructions:**
#         - **The report title should be bold and centered.**
#         - **All report section headers (Chief Complaint, HPI, etc.) should be bold.**
#         - **The main content should be normal text (not bold).**
#         - **Use professional medical terminology throughout.**

#         {input_text}
#         """

#         response = client.chat.completions.create(
#             model="gpt-4",
#             messages=[{"role": "system", "content": structured_prompt}]
#         )

#         corrected_text = response.choices[0].message.content.strip()
#         editor_entry = Editor(result=corrected_text)
#         editor_entry.save()

#         # Return response
#         return jsonify({
#             "corrected_text": corrected_text,
#             "record_id": str(editor_entry.id)
#         })
#         # return jsonify({"corrected_text": corrected_text})

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# ✅ 2️⃣ Identifies mistakes and suggests corrections (New functionality)
@app.route('/identify-mistakes', methods=['POST'])
def identify_mistakes():
    try:
        data = request.get_json()
        input_text = data.get("text", "")

        if not input_text.strip():
            return jsonify({"error": "Empty text provided"}), 400

        highlight_prompt = f"""
        You are an expert proofreader. Analyze the following text and highlight spelling, grammar, and language mistakes.
        - **Mistakes should be bold and underlined in red.**
        - **Next to each mistake, suggest the correct word inside parentheses.**
        - **Keep the rest of the text unchanged.**

        {input_text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": highlight_prompt}]
        )

        identified_mistakes = response.choices[0].message.content.strip()
        return jsonify({"highlighted_text": identified_mistakes})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/compile-report-stream", methods=["POST"])
@jwt_required()
def compile_report_stream():
    try:
        # Extract form fields
        patient_name = request.form.get("patientName")
        age = request.form.get("age")
        fileNumber = request.form.get("fileNumber")
        personal_history = request.form.get("personalHistory")
        chief_complaint = request.form.get("chiefComplaint")
        present_illness = request.form.get("presentIllness")
        medical_history = request.form.get("medicalHistory")
        past_history = request.form.get("pastHistory")
        family_history = request.form.get("familyHistory")
        system_review = request.form.get("systemReview")
        doctor_id = get_jwt_identity()
        doctor_name = request.form.get("doctor_name", "Dr.Test").strip()
        department = request.form.get("department", "Department-Test").strip()

        if not all([patient_name, age, fileNumber]):
            return jsonify({"error": "Missing required patient fields"}), 400

        session_id = str(uuid4())
        chat_sessions[session_id] = []

        def generate():
            answer = ""
            try:
                # Prepare the full input with all required variables
                full_input = {
                    "input": f"Generate medical report for {patient_name}, {age} years old",
                    "chat_history": chat_sessions[session_id],
                    # Context variables for the report template
                    "patient_name": patient_name,
                    "patient_age": age,
                    "file_number": fileNumber,
                    "chief_complaint": chief_complaint or "Not specified",
                    "present_illness": present_illness or "Not specified",
                    "medical_history": medical_history or "Not specified",
                    "past_history": past_history or "Not specified",
                    "personal_history": personal_history or "Not specified",
                    "family_history": family_history or "Not specified",
                    "system_review": system_review or "Not specified",
                    "doctor_name": doctor_name,
                    "department": department
                }
                
                # Stream the response from the report generation chain
                for chunk in report_generation_chain.stream(full_input):
                    token = chunk.get("answer", "")
                    answer += token
                    yield token
                    
            except Exception as e:
                yield f"\n[Error: {str(e)}]"
                return

            # Save to DB after successful generation
            try:
                report = MedicalReport(
                    patient_name=patient_name,
                    age=age,
                    fileNumber=fileNumber,
                    personal_history=personal_history,
                    chief_complaint=chief_complaint,
                    present_illness=present_illness,
                    medical_history=medical_history,
                    past_history=past_history,
                    family_history=family_history,
                    system_review=system_review,
                    compiled_report=answer.strip(),
                    generatedBy="Template Page (Stream)",
                    doctor_name=doctor_name,
                    department=department,
                    doctor_id=doctor_id,
                )
                report.save()
            except Exception as db_error:
                yield f"\n[Database Error: {str(db_error)}]"

        return Response(stream_with_context(generate()), content_type='text/plain')

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/compile-report", methods=["POST"])
@jwt_required()
def create_medical_report():
    try:
        # Extract form fields
        patient_name = request.form.get("patientName")
        age = request.form.get("age")
        fileNumber = request.form.get("fileNumber")
        personal_history = request.form.get("personalHistory")
        chief_complaint = request.form.get("chiefComplaint")
        present_illness = request.form.get("presentIllness")
        medical_history = request.form.get("medicalHistory")
        past_history = request.form.get("pastHistory")
        family_history = request.form.get("familyHistory")
        system_review = request.form.get("systemReview")
        doctor_id = get_jwt_identity()
        doctor_name =request.form.get("doctor_name", "Dr.Test").strip()
        department = request.form.get("department", "Department-Test").strip()
        # Generate AI medical report
        structured_prompt = f"""
        You are an AI medical assistant. Generate a **well-structured** and **professionally formatted** medical report using the following inputs at the end its necessary to write that this report is electronically signed by Doctor Name,Doctor Department:

        **Patient Information:**
        - Name: {patient_name}
        - Age: {age}
        - File Number: {fileNumber} 

        **Chief Complaint:**
        {chief_complaint}

        **History of Present Illness:**
        {present_illness}

        **Medical History:**
        {medical_history}

        **Past History:**
        {past_history}

        **Personal History:**
        {personal_history}

        **Family History:**
        {family_history}

        **System Review:**
        {system_review}

        This report is electronically signed by Doctor - {doctor_name}, Department - {department}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": structured_prompt}]
        )

        compiled_report = response.choices[0].message.content.strip()
        generatedBy="Template Page"

        # Handle doctor signature upload
        # if "doctorSignature" not in request.files:
        #     return jsonify({"error": "No doctor signature file provided"}), 400

        # file = request.files["doctorSignature"]
        # if file.filename == "":
        #     return jsonify({"error": "No file selected"}), 400

        # if not allowed_file(file.filename):
        #     return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        # filename = secure_filename(file.filename)
        # file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        # file.save(file_path)

        # Create and save report in MongoDB
        report = MedicalReport(
            patient_name=patient_name,
            age=age,
            fileNumber=fileNumber,
            personal_history=personal_history,
            chief_complaint=chief_complaint,
            present_illness=present_illness,
            medical_history=medical_history,
            past_history=past_history,
            family_history=family_history,
            system_review=system_review,
            compiled_report=compiled_report,
            generatedBy=generatedBy,
            doctor_name=doctor_name,
            department=department,
            doctor_id=doctor_id,
        )

        # Store the signature file in GridFS
        # with open(file_path, "rb") as f:
        #     report.doctor_signature.put(f, content_type=file.content_type)

        report.save()

        # Remove file from local disk
        # os.remove(file_path)

        return jsonify({
            "compiled_report": compiled_report,
            "report_id": str(report.id),
            "doctor_id": doctor_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/doctor-report', methods=['GET'])
@jwt_required()
def doctor_report():
    doctor_id = get_jwt_identity()
    print(doctor_id)
    reports = MedicalReport.objects()
    if not reports:
        return jsonify({"message": "No report found for this doctor"}), 404
    
    report_list = []
    for report in reports:
        # Read the GridFS file (doctor_signature) and encode it as base64
        # signature_data = report.doctor_signature.read()  
        # signature_base64 = base64.b64encode(signature_data).decode('utf-8')  # Convert to base64 string
        
        report_list.append({
            "id": str(report.id),
            "patient_name": report.patient_name,
            "patient_age": report.age,
            "fileName":report.fileNumber,
            "personal_history": report.personal_history,
            "chief_complaint": report.chief_complaint,
            "present_illness": report.present_illness,
            "medical_history": report.medical_history,
            "past_history": report.past_history,
            "family_history": report.family_history,
            "system_review": report.system_review,
            "date_of_report": report.date_of_report,
            "doctor_id": report.doctor_id,
            "generatedBy": report.generatedBy,
            "doctor_name": report.doctor_name,
            "department": report.department,
            "compiled_report": report.compiled_report,
            # "doctor_signature": signature_base64,  # Include the base64-encoded signature
        })
    
    return jsonify(report_list), 200  # Move return outside the loop


# ✅ 4️⃣ Process PDF Report and Convert to Structured Format
@app.route('/process-pdf', methods=['POST'])
def process_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']

        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Invalid file format. Please upload a PDF"}), 400

        # Read PDF and extract text
        pdf_text = extract_text_from_pdf(file)

        if not pdf_text.strip():
            return jsonify({"error": "Extracted text is empty"}), 400

        # Process extracted text with OpenAI
        structured_prompt = f"""
        You are a medical AI assistant. Convert the following extracted medical report into a **well-structured, formatted, and professional** document:

        **Formatting Instructions:**
        - **Ensure each section title is bold (Chief Complaint, HPI, etc.).**
        - **Maintain clinical terminology and ensure medical coherence.**
        - **Remove unnecessary noise, page numbers, and artifacts from OCR extraction.**

        Extracted Report:
        {pdf_text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": structured_prompt}]
        )

        structured_text = response.choices[0].message.content.strip()
        return jsonify({"structured_text": structured_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Helper Function: Extract Text from PDF
def extract_text_from_pdf(file):
    try:
        text = ""
        with fitz.open(stream=file.read(), filetype="pdf") as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
        return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

# ✅ 4️⃣ Translate Medical Report
@app.route('/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        text = data.get("text", "")
        target_language = data.get("target_language", "en")  # Default to English

        if not text.strip():
            return jsonify({"error": "No text provided for translation"}), 400

        if target_language not in ["en", "ar", "fr"]:
            return jsonify({"error": "Invalid language selected"}), 400

        translation_prompt = f"""
        Translate the following medical report into {target_language.upper()}:
        {text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": translation_prompt}]
        )

        translated_text = response.choices[0].message.content.strip()
        return jsonify({"translated_text": translated_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def speech_to_text(audio_data_path):
    with open(audio_data_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            response_format="text",
            file=audio_file
        )
    return {"text": transcript}

def extract_fields(transcript):
    prompt = f"""
        You are a medical transcription service provider. Your main task is to extract all relevant fields of text from the transcript: {transcript}
        and display them in a user form format. Please strictly adhere to the following format template, use medical terms:
        **Patient Name:**
        **Age:**
        **File Number:**
        **Chief Complaint:**
        **Present Illness:**
        **Medical History:**
        **Past History:**
        **Family History:**
        **Personal History:**
        **System Review:**
        Display each field on a new line, do not combine them into one sentence. Your main job is to facilitate data entry for doctors using medical terminologies to describe the cases.
    """
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def extract_between(text, start_marker, end_marker=None):
    try:
        start_index = text.index(start_marker) + len(start_marker)
        if end_marker:
            end_index = text.index(end_marker, start_index)
            return text[start_index:end_index].strip()
        else:
            return text[start_index:].strip()
    except ValueError:
        return ""

@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio_data" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400  
    audio_file = request.files["audio_data"]
    supported_formats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
    file_extension = audio_file.filename.split('.')[-1].lower()
    if file_extension not in supported_formats:
        return jsonify({"error": f"Unsupported file format: {file_extension}. Supported formats: {supported_formats}"}), 400
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_audio:
        audio_file.save(temp_audio.name)
        temp_audio_path = temp_audio.name
    try:
        transcript_result = speech_to_text(temp_audio_path)
    finally:
        os.remove(temp_audio_path)

    return jsonify({"transcript": transcript_result.get("text", "")})

@app.route("/extract_fields", methods=["POST"])
def extract():
    data = request.get_json()
    transcript = data.get("transcript", "")
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400

    try:
        fields_result = extract_fields(transcript)
        print("Fields Result:", fields_result)
        fields = {
            "patientName": extract_between(fields_result, "**Patient Name:**", "**Age:**"),
            "age": extract_between(fields_result, "**Age:**", "**File Number:**"),
            "fileNumber": extract_between(fields_result, "**File Number:**", "**Chief Complaint:**"),
            "chiefComplaint": extract_between(fields_result, "**Chief Complaint:**", "**Present Illness:**"),
            "presentIllness": extract_between(fields_result, "**Present Illness:**", "**Medical History:**"),
            "medicalHistory": extract_between(fields_result, "**Medical History:**", "**Past History:**"),
            "pastHistory": extract_between(fields_result, "**Past History:**", "**Family History:**"),
            "familyHistory": extract_between(fields_result, "**Family History:**", "**Personal History:**"),
            "personalHistory": extract_between(fields_result, "**Personal History:**", "**System Review:**"),
            "systemReview": extract_between(fields_result, "**System Review:**")
        }

        return jsonify(fields)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Field extraction error: {str(e)}"}), 500

@app.errorhandler(Exception)
def handle_error(e):
    return jsonify({"error": str(e)}), 500

@app.route("/extract_report_fields", methods=["POST"])
def extract_report_fields():
    data = request.get_json()
    transcript = data.get("transcript", "")
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400

    prompt = f"""
You are a helpful medical assistant. Extract from:
{transcript}

Please output exactly:

**Patient Name:**
**Age:**
**File Number:**
**Medical Report:**

Use medical terminology and separate each field on its own line.
"""

    resp = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    result = resp.choices[0].message.content

    def get_between(text, start, end=None):
        try:
            i = text.index(start) + len(start)
            if end:
                j = text.index(end, i)
                return text[i:j].strip()
            return text[i:].strip()
        except ValueError:
            return ""

    fields = {
        "patientName": get_between(result, "**Patient Name:**", "**Age:**"),
        "age": get_between(result, "**Age:**", "**File Number:**"),
        "fileNumber": get_between(result, "**File Number:**", "**Medical Report:**"),
        "medicalReport": get_between(result, "**Medical Report:**"),
    }
    return jsonify(fields)


if __name__ == '__main__':
    app.run(debug=True)