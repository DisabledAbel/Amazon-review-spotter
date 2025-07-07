# ???? Amazon Review Validator

Detect fake, paid, or AI-generated Amazon product reviews using a systematic LLM-based investigation.

---

## ???? Overview

**Amazon Review Validator** is a light-weight application for reviewing the authenticity of Amazon reviews. It utilizes natural language analysis combined with reviewer behavioral cues to find suspicious patterns. Powered by large language models (LLMs) like GPT-4, this application helps you filter out inauthentic or incentivized reviews from legitimate customer reviews.

---

## ✅ Features

- ???? Analyzes review text for tone, specificity, and unnatural language
- ????‍???? Inspects reviewer profile: review count, frequency, bias, and history
- ???? Red flags burst activity, generic compliments, and unverifiable statements
- ???? Returns structured outputs with a **Genuineness Score** and **verdict**
- ???? Powered by a custom-built prompt for accuracy and reliability

---
## ????️ How It Works

The tool feeds review text and reviewer metadata into a language model via an engineered prompt intended to test for authenticity.

**Your Input Requirements:**
- Product name and (optional) product description
- Review text
- Reviewer profile (name, number of reviews, average rating, recent activity, etc.).
