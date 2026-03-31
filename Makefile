# Compilar Dockerfile
build:
	docker build -t antigravity .

# Iniciar contenedor de Antigravity
start:
	docker run -p 8080:8080 antigravity

# Detener contenedor de Antigravity
stop:
	docker stop $$(docker ps -q)

# Reiniciar contenedor de Antigravity
restart:
	docker restart $$(docker ps -q)
