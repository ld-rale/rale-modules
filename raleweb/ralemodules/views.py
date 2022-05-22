from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.generic.base import TemplateView

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
    # load the design patterns data

    # check if it already exists in the database

    # if not add the pattern to the database

    return JsonResponse({"response":"added pattern" + dpdetails})