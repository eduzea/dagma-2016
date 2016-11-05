# -*- coding: utf-8 -*-
import webapp2
import jinja2

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader('templates'),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class Home(webapp2.RequestHandler):
    def get(self):
        template = JINJA_ENVIRONMENT.get_template('home.html')
        self.response.write(template.render())
    

class WeightedTree(webapp2.RequestHandler):
    def get(self):
        treeName = self.request.get('tree')
        template = JINJA_ENVIRONMENT.get_template('WeightedTreeTest.html')
        self.response.write(template.render({'tree':treeName}))
