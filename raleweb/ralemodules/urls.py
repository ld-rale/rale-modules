from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('exercises/', views.ExercisesView.as_view(), name='exercises'),
]