from .models import VaccineType, Vaccine
from django.db.models import Count

def load_vaccine(param={}):
    q = Vaccine.objects.filter(active=True)

    kw = param.get('kw')
    if kw:
        q = q.filter(subject__contains=kw)

    vaccine_type_id = param.get('vaccine_type')
    if vaccine_type_id:
        q = q.filter(vaccine_type_id=vaccine_type_id)

    return q

def count_vaccine_by_type():
    return VaccineType.objects.annotate(count=Count('id')).values('id', 'name', 'count').order_by('count')