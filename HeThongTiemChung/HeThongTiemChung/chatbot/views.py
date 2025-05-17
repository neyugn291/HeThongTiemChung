from django.shortcuts import render
from django.http import JsonResponse
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Khởi tạo tokenizer và model 1 lần khi load server
tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")

# Hàm xử lý lấy câu trả lời
def get_response(message, chat_history_ids=None):
    prefix = "You are a helpful assistant specialized in vaccine information. "
    message = prefix + message
    new_input_ids = tokenizer.encode(message + tokenizer.eos_token, return_tensors='pt')
    bot_input_ids = torch.cat([chat_history_ids, new_input_ids], dim=-1) if chat_history_ids is not None else new_input_ids
    chat_history_ids = model.generate(bot_input_ids, max_length=1000, pad_token_id=tokenizer.eos_token_id)
    response = tokenizer.decode(chat_history_ids[:, bot_input_ids.shape[-1]:][0], skip_special_tokens=True)
    return response, chat_history_ids


# View xử lý chat
def chat_view(request):
    # Có thể dùng session để lưu chat_history_ids cho mỗi user
    chat_history_ids = request.session.get('chat_history_ids')

    if chat_history_ids is not None:
        chat_history_ids = torch.tensor(chat_history_ids)

    if request.method == "POST":
        message = request.POST.get("message")
        response_text, chat_history_ids = get_response(message, chat_history_ids)
        # Lưu lại vào session (chuyển tensor về list)
        request.session['chat_history_ids'] = chat_history_ids.tolist()
        return JsonResponse({"response": response_text})

    return render(request, "chatbot/chatbot.html")
