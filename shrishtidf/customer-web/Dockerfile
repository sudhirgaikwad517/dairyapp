# The customer app (the same Flutter app as on the phone) for the browser, served at shrishtidairyfarm.com/app/.
# html/ is made by build.sh from the Flutter project in the repo root.
FROM nginx:alpine

COPY html /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
