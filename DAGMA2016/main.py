import webapp2
from handlers import *


application = webapp2.WSGIApplication([
    #User Management 
    ('/', Home),  
    ('/home', Home),# The rooot of the 1-page app                               
    ('/weightedtree',WeightedTree)
], debug=True)