from django.db import models

class DesignPattern(models.Model):
    name = models.TextField(default='', blank=True, null=True)
    details = models.JSONField()