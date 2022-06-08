from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.generic.base import TemplateView
from .models import *
import json
import csv
from django.template.defaulttags import register

# Create your views here.

# https://fedingo.com/how-to-lookup-dictionary-value-with-key-in-django-template/
@register.filter
def get_value(dictionary, key):
    return dictionary.get(key)

def index(request):
    return HttpResponse("Hello, world. You're at the ralemodules index.")

class ExercisesView(TemplateView):
    template_name = 'ralemodules/exercises.html'

    def get(self, request, *args, **kwargs):
        # print('in ExercisesView')

        # get codebase folder
        codebase_dp_details = None
        with open('../out/dp.csv', newline='\n') as csvfile:
            dpreader = csv.reader(csvfile, delimiter=',', quotechar='"', doublequote=True)
            for row in dpreader:
                #print(', '.join(row))
                #print("request.GET['file']", request.GET['file'])
                #print("row[0]", row[0])
                if len(row) > 1 \
                    and (row[0] == request.GET['file'] or row[0] == request.GET['file'] + "/"):
                    # print("found file")
                    codebase_dp_details = row[1]
                    break

        # extract design patterns from csv
        print("codebase_dp_details", codebase_dp_details)
        codebase_dp = json.loads(codebase_dp_details)
        print("codebase_dp", codebase_dp)

        context = {
            'dp': codebase_dp,
        }
        return render(request, self.template_name, context)
