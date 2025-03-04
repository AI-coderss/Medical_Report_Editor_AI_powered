from flask import Flask, request, jsonify
from openai import OpenAI
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Get API key from .env file
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Ensure the API key is loaded correctly
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key not found. Please set it in the .env file.")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

@app.route('/correct-text', methods=['POST'])
def correct_text():
    try:
        data = request.get_json()
        input_text = data.get("text", "")

        if not input_text.strip():
            return jsonify({"error": "Empty text provided"}), 400

        # Send text to GPT-4 for correction
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content":    """You are an expert medical editor with deep knowledge of clinical documentation, medical terminology, and structured reporting. Your task is to refine and improve the following medical report while ensuring grammatical accuracy, professional tone, and adherence to standard medical documentation formats.

                                                        Guidelines:
                                                        - Correct all grammatical, spelling, and syntactical mistakes.
                                                        - Maintain a formal, clinical tone suitable for medical professionals.
                                                        - Use precise medical terminology instead of generic terms.
                                                        - Ensure the report follows a structured format including:
                                                        - Chief Complaint: Clearly state the primary issue.
                                                        - History of Present Illness (HPI): Describe the onset, duration, severity, and progression of symptoms using detailed clinical language.
                                                        - Past Medical History (PMH): List relevant medical conditions, previous surgeries, and chronic illnesses.
                                                        - Medications: Ensure all medications are properly capitalized, with dosages and frequencies in standard format.
                                                        - Physical Examination (PE): Use proper medical phrasing, e.g., “Lungs: Clear to auscultation bilaterally (CTAB).”
                                                        - Laboratory & Imaging Findings: Present lab results in structured format, referencing normal ranges where applicable.
                                                        - Assessment & Plan: Clearly outline the differential diagnosis, treatment plan, and any follow-up recommendations.:"""},
                {"role": "user", "content": input_text}
            ]
        )

        corrected_text = response.choices[0].message.content.strip()

        return jsonify({"corrected_text": corrected_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
