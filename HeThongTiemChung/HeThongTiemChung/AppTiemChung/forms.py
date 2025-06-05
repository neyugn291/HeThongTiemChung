from django import forms

from .models import Faq


class FaqForm(forms.ModelForm):
    class Meta:
        model = Faq
        fields = ['question_keywords', 'answer']
        widgets = {
            'question_keywords': forms.TextInput(attrs={'class': 'form-control'}),
            'answer': forms.Textarea(attrs={'class': 'form-control', 'rows': 5}),
        }
