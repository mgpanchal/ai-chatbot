import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

let API_KEY = 'Key-Here'; // Keep it secure

let form = document.getElementById('chat-form');
let promptInput = document.getElementById('promptInput');
let output = document.querySelector('.output');
let isImageUploaded = false; 
let currentImageBase64 = '';  

form.onsubmit = async (ev) => {
  ev.preventDefault();

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  
  if (!isImageUploaded && file) {
    currentImageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = () => {
        const base64String = reader.result;
        // Display the uploaded image only once
        output.innerHTML += `<div class="flex items-center mb-2">
                              <p class="text-blue-600 font-bold mr-2">You:</p>
                              <img src="${base64String}" alt="Uploaded Image" class="w-32 h-auto rounded-md"/>
                            </div>`;
        resolve(base64String.split(',')[1]);  
      };

      reader.onerror = () => reject('Error reading file.');
    });

    isImageUploaded = true;  
  }

  if (!currentImageBase64) {
    output.innerHTML += '<p class="text-red-500">Please upload an image.</p>';
    return;
  }

  let question = promptInput.value;
  promptInput.value = ''; 

  output.innerHTML += `<p class="text-blue-600"><strong>You:</strong> ${question}</p>`;

  try {
    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: file?.type || 'image/jpeg', data: currentImageBase64 } },  // Use stored image data
          { text: question + ". Answer in one short sentence." }  // Instructing for short response
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const result = await model.generateContentStream({ contents });

    let fullResponse = ''; 
    let md = new MarkdownIt();
    
    for await (let response of result.stream) {
      fullResponse += response.text();
    }

    output.innerHTML += `<p class="text-green-600"><strong>AI:</strong> ${md.render(fullResponse)}</p>`;

  } catch (e) {
    output.innerHTML += `<p class="text-red-500">Error: ${e}</p>`;
  }
};

maybeShowApiKeyBanner(API_KEY);
