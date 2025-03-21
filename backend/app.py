from flask import Flask, request, jsonify
from openai import OpenAI
from flask_cors import CORS
import os
from dotenv import load_dotenv
import fitz

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Enable CORS for frontend communication (React running on localhost:3000)
CORS(app, resources={r"/*": {"origins": "https://medical-report-editor-ai-powered-dsah.onrender.com"}})

# Get OpenAI API key from .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Ensure API key is loaded correctly
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key not found. Please set it in the .env file.")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# ✅ 1️⃣ Corrects and improves the report (Original functionality)
@app.route('/correct-text', methods=['POST'])
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
        return jsonify({"corrected_text": corrected_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

# ✅ 3️⃣ Compiles a structured medical report from form input
@app.route('/compile-report', methods=['POST'])
def compile_report():
    try:
        data = request.get_json()

        structured_prompt = f"""
        You are an AI medical assistant. Generate a **well-structured** and **professionally formatted** medical report using the following inputs:

        **Patient Information:**
        - Name: {data.get("patientName", "N/A")}
        - Age: {data.get("age", "N/A")}

        **Chief Complaint:**
        {data.get("chiefComplaint", "N/A")}

        **History of Present Illness:**
        {data.get("historyOfPresentIllness", "N/A")}

        **Past Medical History:**
        {data.get("pastMedicalHistory", "N/A")}

        **Family History:**
        {data.get("familyHistory", "N/A")}

        **Medications:**
        {data.get("medications", "N/A")}

        **Allergies:**
        {data.get("allergies", "N/A")}

        **Review of Systems:**
        {data.get("reviewOfSystems", "N/A")}

        **Physical Examination:**
        {data.get("physicalExamination", "N/A")}

        **Investigations:**
        {data.get("investigations", "N/A")}

        **Assessment & Plan:**
        {data.get("assessmentPlan", "N/A")}

        **Doctor's Signature:**
        {data.get("doctorSignature", "N/A")}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "system", "content": structured_prompt}]
        )

        compiled_report = response.choices[0].message.content.strip()
        return jsonify({"compiled_report": compiled_report})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
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



