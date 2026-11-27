from rest_framework.routers import DefaultRouter

from .views import PropertyViewSet

# The router generates the URLs for the ViewSet: /properties/ (GET list, POST create) and
# /properties/<id>/ (GET, PATCH, DELETE), plus the /properties/cities/ action
router = DefaultRouter()
router.register("properties", PropertyViewSet)
urlpatterns = router.urls
