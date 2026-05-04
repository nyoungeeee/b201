from rest_framework import serializers


class PolicyDocumentSerializer(serializers.Serializer):
    type = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    version = serializers.CharField(required=True)
    effective_date = serializers.DateField(required=True)
    content = serializers.CharField(required=True)
