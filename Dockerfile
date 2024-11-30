FROM python:3.10-slim
WORKDIR /app
COPY . .
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 5000
CMD ["/wait-for-it.sh", "db:5432", "--", "flask", "run", "--host=0.0.0.0"]
