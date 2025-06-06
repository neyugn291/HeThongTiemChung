from django.db.models import Count, Q

from .models import VaccineType, Vaccine


def load_vaccine(param={}):
    q = Vaccine.objects.filter(status='Active')
    kw = param.get('kw')
    if kw:
        q = q.filter(name__icontains=kw)

    vaccine_type_id = param.get('vaccine_type')
    if vaccine_type_id:
        q = q.filter(vaccine_type_id=vaccine_type_id)

    return q


def count_vaccine_by_type():
    return VaccineType.objects.annotate(
        count=Count('vaccine', filter=Q(vaccine__status='Active'))
    ).values('id', 'name', 'count').order_by('-count')
