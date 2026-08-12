# HealthAI Voice Screening

HealthAI is a voice-first health screening application that asks a short set of questions, records the user’s spoken answers, and generates a brief AI summary at the end of the assessment.

The app uses:
- React + Vite for the frontend
- Express + TypeScript for the backend API
- Google Gemini for the health screening prompts and final summary
- Browser speech recognition and speech synthesis for voice interaction

## Features
- Start a new assessment session
- Ask one health question at a time
- Capture user responses using browser voice recognition
- Generate a final screening summary with Gemini
- Keep the assessment flow simple and conversational
- Display safety messaging that the summary is not a medical diagnosis

## Repository structure

```bash
.
├── client/          # React frontend
├── server/          # Express backend API
├── README.md        # Project setup and usage instructions
├── .gitignore
└── .env.example     # Root-level example for shared config (optional)
```

## Prerequisites

Before starting, make sure you have:
- Node.js 18+ installed
- npm installed
- A Google AI Studio account with a Gemini API key
- Chrome or Edge browser for speech recognition support

## 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd health-ai-assessment

cd client && npm install
cd ../server && npm install
```

## 2) Environment variables

### Backend
Copy the example file and add your Gemini key:

```bash
cd server
cp .env.example .env
```

Then update `server/.env`:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=5001
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

You can create a Gemini API key from Google AI Studio:
- Go to https://aistudio.google.com/app/apikey
- Create a new API key
- Copy it into `GEMINI_API_KEY`

### Frontend
Create the frontend environment file:

```bash
cd client
cp .env.example .env
```

Then update `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

## 3) Run the app

Start the server in one terminal:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:5173
```

## 4) Production build

```bash
cd server && npm run build
cd ../client && npm run build
```

## Notes
- The app is intended for general health screening and educational conversation only.
- It is not a diagnosis and should not replace advice from a qualified healthcare professional.
- If the Gemini API quota is exhausted, the app will return a clear usage-limit message.

## License

This project is shared for assessment/demo purposes.
