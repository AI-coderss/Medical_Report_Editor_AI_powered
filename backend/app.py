from flask import Flask, request, jsonify
from openai import OpenAI
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Enable CORS for frontend communication (React running on localhost:3000)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

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

        # GPT-4 structured medical editing prompt
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
        - **Ensure proper bullet points for lists when needed.**
        - **Use professional medical terminology throughout.**

        {input_text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": structured_prompt}
            ]
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

        # GPT-4 prompt to detect and highlight mistakes
        highlight_prompt = f"""
        You are an expert proofreader and AI assistant.
        Your task is to analyze the following text and identify spelling, grammar, and language mistakes.
        - **Mistakes should be bold and underlined in red.**
        - **Next to each mistake, suggest the correct word inside parentheses.**
        - **Keep the rest of the text unchanged.**

        **Example Output:**
        **Chief Complaint:**  
        The patient presents with **teh** (the) acute pain.

        **History of Present Illness (HPI):**  
        - The patient **have** (has) been experiencing symptoms for 2 days.
        - The medication **was took** (was taken) at night.

        **Assessment & Plan:**  
        - The doctor **recomend** (recommends) further testing.
        
        Apply this formatting to the following text:

        {input_text}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": highlight_prompt}
            ]
        )

        identified_mistakes = response.choices[0].message.content.strip()

        return jsonify({"highlighted_text": identified_mistakes})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)


