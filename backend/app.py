from flask import Flask, request, jsonify, make_response
from openai import OpenAI
from flask_cors import CORS
import os
from dotenv import load_dotenv
import fitz
from mongoengine import connect, Document, StringField, FileField, ValidationError, ListField
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, create_refresh_token
import re
import bcrypt
from pymongo import MongoClient
from bson import ObjectId 
import datetime
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
import base64

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

# Get OpenAI API key from .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key not found. Please set it in the .env file.")


app.config['JWT_SECRET_KEY'] = 'my-super-secret-key-12345' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)  
jwt = JWTManager(app)

# Directory to store uploaded files (e.g., doctor's signature)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'} 
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# User Model
class User(Document):
    firstName = StringField(required=True)
    lastName = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    department = StringField()
    
    

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Medical Report Model
class MedicalReport(Document):
    patient_name = StringField( max_length=100)
    age = StringField(max_length=10)
    chief_complaint = StringField()
    history_of_present_illness = StringField()
    past_medical_history = StringField()
    family_history = StringField()
    medications = StringField()
    allergies = StringField()
    review_of_systems = StringField()
    physical_examination = StringField()
    investigations = StringField()
    assessment_plan = StringField()
    doctor_signature = FileField()
    result = StringField()
    compiled_report=StringField()
    doctor_id = StringField(required=True)
# class Editor(Document):
#     text = StringField(required=True)
#     result = StringField(required=True)
# class Editor(Document):
#     result = StringField(required=True)
#     meta = {'collection': 'corrected_reports'}
class Editor(Document):
    result = StringField(required=True)
    doctor_id = StringField(required=True)    
    meta = {'collection': 'corrected_reports'}

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

    # Validate user existence and check password
    if not user or not check_password(password, user.password):
        return jsonify({'error': 'Invalid email or password'}), 401

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
        'email': user.email
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

        # Delete the user
        user.delete()

        # Return success response
        return jsonify({
            'message': 'User deleted successfully',
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
            # Get base64-encoded image data if signature exists
            signature_data = None
            if report.doctor_signature:
                signature_data = base64.b64encode(report.doctor_signature.read()).decode('utf-8')
            report_dict = {
                "id": str(report.id),
                "patient_name": report.patient_name,
                "age": report.age,
                "chief_complaint": report.chief_complaint,
                "history_of_present_illness": report.history_of_present_illness,
                "past_medical_history": report.past_medical_history,
                "family_history": report.family_history,
                "medications": report.medications,
                "allergies": report.allergies,
                "review_of_systems": report.review_of_systems,
                "physical_examination": report.physical_examination,
                "investigations": report.investigations,
                "assessment_plan": report.assessment_plan,
                "doctor_signature": signature_data,
                "compiled_report":report.compiled_report  
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

          
        if report.doctor_signature:
            report.doctor_signature.delete()

        # Delete the report
        report.delete()

        # Return success response
        return jsonify({
            'message': 'Medical report deleted successfully',
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

        if not input_text.strip():
            return jsonify({"error": "Empty text provided"}), 400

        structured_prompt = f"""
        You are an expert medical editor with deep knowledge of clinical documentation, medical terminology, and structured reporting.
        Your task is to refine and improve the following medical report while ensuring:
        - Grammatical accuracy
        - Professional tone
        - Adherence to standard medical documentation formats.

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
        editor_entry = Editor(result=corrected_text,doctor_id=doctor_id)
        editor_entry.save()

        # Return response
        return jsonify({
            "corrected_text": corrected_text,
            "record_id": str(editor_entry.id)
        })
        # return jsonify({"corrected_text": corrected_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
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

@app.route("/compile-report", methods=["POST"])
@jwt_required()
def create_medical_report():
    try:
        
        # Extract form fields from request.form (not request.json)
        patient_name = request.form.get("patientName")
        age = request.form.get("age")
        chief_complaint = request.form.get("chiefComplaint")
        history_of_present_illness = request.form.get("historyOfPresentIllness")
        past_medical_history = request.form.get("pastMedicalHistory")
        family_history = request.form.get("familyHistory")
        medications = request.form.get("medications")
        allergies = request.form.get("allergies")
        review_of_systems = request.form.get("reviewOfSystems")
        physical_examination = request.form.get("physicalExamination")
        investigations = request.form.get("investigations")
        assessment_plan = request.form.get("assessmentPlan")
        doctor_id = get_jwt_identity()
        print(doctor_id, "fhghghfghfhgghgh")

# Generate AI medical report
        structured_prompt = f"""
            You are an AI medical assistant. Generate a **well-structured** and **professionally formatted** medical report using the following inputs:

            **Patient Information:**
            - Name: {patient_name}
            - Age: {age}

            **Chief Complaint:**
            {chief_complaint}

            **History of Present Illness:**
            {history_of_present_illness}

            **Past Medical History:**
            {past_medical_history}

            **Family History:**
            {family_history}

            **Medications:**
            {medications}

            **Allergies:**
            {allergies}

            **Review of Systems:**
            {review_of_systems}

            **Physical Examination:**
            {physical_examination}

            **Investigations:**
            {investigations}

            **Assessment & Plan:**
            {assessment_plan}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": structured_prompt}]
        )

        compiled_report = response.choices[0].message.content.strip()

        # Handle signature file upload
        if "doctorSignature" not in request.files:
            return jsonify({"error": "No doctor signature file provided"}), 400

        file = request.files["doctorSignature"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        # Secure the filename and save it
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        # Save report in MongoDB
        report = MedicalReport(
            patient_name=patient_name,
            age=age,
            chief_complaint=chief_complaint,
            history_of_present_illness=history_of_present_illness,
            past_medical_history=past_medical_history,
            family_history=family_history,
            medications=medications,
            allergies=allergies,
            review_of_systems=review_of_systems,
            physical_examination=physical_examination,
            investigations=investigations,
            assessment_plan=assessment_plan,
            doctor_id = doctor_id,
            compiled_report=compiled_report,
            
        )
        # Store signature file in MongoDB GridFS
        with open(file_path, "rb") as f:
            report.doctor_signature.put(f, content_type=file.content_type)

        report.save()

        # Optionally, remove the file from the local server
        os.remove(file_path)

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
    reports = MedicalReport.objects(doctor_id=doctor_id)
    if not reports:
        return jsonify({"message": "No report found for this doctor"}), 404
    
    report_list = []
    for report in reports:
        # Read the GridFS file (doctor_signature) and encode it as base64
        signature_data = report.doctor_signature.read()  
        signature_base64 = base64.b64encode(signature_data).decode('utf-8')  # Convert to base64 string
        
        report_list.append({
            "id": str(report.id),
            "patient_name": report.patient_name,
            "age": report.age,
            "chief_complaint": report.chief_complaint,
            "history_of_present_illness": report.history_of_present_illness,
            "past_medical_history": report.past_medical_history,
            "family_history": report.family_history,
            "medications": report.medications,
            "allergies": report.allergies,
            "review_of_systems": report.review_of_systems,
            "physical_examination": report.physical_examination,
            "investigations": report.investigations,
            "assessment_plan": report.assessment_plan,
            "compiled_report": report.compiled_report,
            "doctor_signature": signature_base64,  # Include the base64-encoded signature
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

if __name__ == '__main__':
    app.run(debug=True)