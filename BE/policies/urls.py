from django.urls import path

from policies.views import PrivacyPolicyView, TermsOfServiceView


urlpatterns = [
    path("terms/", TermsOfServiceView.as_view(), name="terms_of_service"),
    path("privacy/", PrivacyPolicyView.as_view(), name="privacy_policy"),
]
