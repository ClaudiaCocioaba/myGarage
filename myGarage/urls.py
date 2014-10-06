from myGarageApp.views import user_logout, home_page, addNewCar, addCleaning, garageView, carCleanings
from django.contrib import admin
from django.conf.urls import patterns, url, include
from myGarageApp import views
from django.conf.urls import include
admin.autodiscover()



urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'myGarage.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),
    #url(r'^register/$', register),
    #url(r'^login/$', user_login),
    url(r'^logout/$', user_logout),
    #url(r'^home/$', home_page),
    url(r'^new_car/$', addNewCar),
    #url(r'^my_cars/$', myCars),
    #url(r'^my_cars/\d+/$', myCars),   
    url(r'^add_cleaning/$', addCleaning), 
    url(r'^cleanings/$', carCleanings),
    url(r'^garage/$', garageView), 
    url(r'^garage/(\d{1})/$', garageView),    
    url(r'^$', home_page),


)


