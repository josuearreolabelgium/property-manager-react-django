from rest_framework.routers import DefaultRouter

from .views import PropertyViewSet 
# EXERCISE 3: the URLs
# A router generates all the CRUD URLs for a ViewSet automatically:
#   /properties/       (GET list, POST create)
#   /properties/<id>/  (GET, PATCH, DELETE)
#
# TODO 3.1: import PropertyViewSet from .views
# TODO 3.2: create a router = DefaultRouter()
# TODO 3.3: register the viewset under the prefix "properties"
#           hint: router.register("properties", ...)

router = DefaultRouter()  
router.register("properties", PropertyViewSet)  
urlpatterns = router.urls

# Docs: https://www.django-rest-framework.org/api-guide/routers/
