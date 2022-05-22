from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.generic.base import TemplateView
from models import *
import json

# Create your views here.

def index(request):
    return HttpResponse("Hello, world. You're at the ralemodules index.")

class ExercisesView(TemplateView):
    template_name = 'ralemodules/exercises.html'

    def get(self, request, *args, **kwargs):
        print('in ExercisesView')
        context = {
            'design_pattern': "dp",
        }
        return render(request, self.template_name, context)

def design_patterns(request):
    dpdetails = request.POST['dpdetails']
    dpj = json.loads(dpdetails)
    # load the design patterns data
    dp = DesignPattern(name=dpj.name, details=dpj.details)
    # check if it already exists in the database
    
    # if not add the pattern to the database
    dp.save()
    return JsonResponse({"response":"added pattern" + dpdetails})