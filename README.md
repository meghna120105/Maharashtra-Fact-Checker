# 🛡️ Maharashtra Fact-Checker

### News • Evidence • Clarity

An AI-powered news platform that helps users explore Maharashtra news, analyze claims against available evidence, and generate news summaries in **English, Hindi, and Marathi**.

## 📸 Screenshots

### 🏠 Home Page — Light Mode
<img width="1907" height="1022" alt="image" src="https://github.com/user-attachments/assets/4e1271f1-36b0-49bb-855a-5aa882cce202" />


### 🌙 Home Page — Dark Mode
<img width="1912" height="1036" alt="image" src="https://github.com/user-attachments/assets/63a26940-1665-4b82-97c0-58e2221b32f7" />


### 📰 How It Works & Latest News
<img width="1907" height="1048" alt="image" src="https://github.com/user-attachments/assets/94e4b29e-ba42-41d8-8e81-0ea3b1d940f9" />


### 🔎 News Cards & Fact-Checking
<img width="1657" height="1022" alt="image" src="https://github.com/user-attachments/assets/f41b3fdd-b5e6-4c31-a0ea-71388e162eee" />


## ✨ Features

- 📰 **Maharashtra Live News:** Browse regional news headlines.
- 🔍 **Smart Search:** Search for news by keywords.
- 📍 **Category Filters:** Explore Mumbai, Pune, Nagpur, Politics, Business, Infrastructure, Crime, and Sports.
- 🤖 **AI Fact-Checking:** Analyze claims against available evidence.
- 📝 **AI News Summarization:** Generate concise news summaries.
- 🌐 **Multilingual Summaries:** English, Hindi, and Marathi.
- 🖼️ **Article Images:** Display news thumbnails when available.
- 🔗 **Original Sources:** Read articles from their publishers.
- 🌙 **Dark & Light Themes:** Switch between visual themes.
- 📱 **Responsive Design:** Use the platform on desktop and mobile.
- 📄 **Flexible Input:** Submit a news URL or paste news text for analysis.

## 🛠️ Technology Stack

- **Frontend:** React.js, Vite
- **AI Provider:** Groq API
- **Optional Local AI:** Ollama with Qwen 2.5
- **Optional Embeddings:** Nomic Embed Text
- **Styling:** CSS

*The exact technologies depend on the components enabled in the current implementation.*
## 🚀 To Understand The Workflow :
[![Architecture diagram](https://gitdiagram.com/diagram-badge.svg)](https://gitdiagram.com/meghna120105/maharashtrafactcheck?utm_source=readme&utm_medium=badge)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/meghna120105/Maharashtra-Fact-Checker.git
cd Maharashtra-Fact-Checker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file locally using the variable names required by your application.

Example:

```env
GROQ_API_KEY=your_groq_api_key
```

Replace the example with your actual API key. Never upload `.env` or expose API keys in frontend code.

### 4. Start the Application

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually `http://localhost:5173`.

If your project has a separate backend, start it using the command specified in its configuration.

## 🌍 Multilingual Summarization

The platform supports news summaries in:

- 🇬🇧 English
- 🇮🇳 Hindi
- 🇮🇳 Marathi

Choose the desired language when the option is available in the application.

## 🔐 Security

- Keep `.env` excluded through `.gitignore`.
- Never commit API keys, passwords, or secret tokens.
- If a key is accidentally published, revoke it and generate a replacement.

## ⚠️ Limitations

- News availability depends on the configured news providers.
- Some publishers restrict article images and content extraction.
- AI-generated results can be incorrect.
- Fact-checking reliability depends on the quality of available evidence.
- API services may enforce usage limits.

**Always review the supporting evidence and original sources before treating a claim as verified.**

## 🚀 Future Improvements

- More regional news sources.
- Improved evidence retrieval.
- Enhanced multilingual analysis.
- Better article image extraction.
- Transparent credibility indicators.
- Saved fact-check reports.

## 👩‍💻 Author

**Meghna Mishra**

Developed as an AI-powered news analysis and fact-checking project focused on Maharashtra.

## 📄 License

A license can be added when the project’s reuse and distribution terms are decided.
