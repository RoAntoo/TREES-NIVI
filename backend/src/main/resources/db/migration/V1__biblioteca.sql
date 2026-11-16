CREATE TABLE libros (
    id UUID PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    isbn VARCHAR(13),
    isbn_canonico VARCHAR(13),
    id_edicion_externa VARCHAR(40),
    id_obra_externa VARCHAR(40),
    url_portada VARCHAR(500),
    total_paginas INTEGER,
    pagina_actual INTEGER NOT NULL CHECK (pagina_actual >= 0),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE','LEYENDO','PAUSADO','TERMINADO')),
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('MANUAL','OPEN_LIBRARY')),
    version BIGINT NOT NULL,
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    actualizado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    terminado_en TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uq_libro_isbn UNIQUE (isbn_canonico),
    CONSTRAINT uq_libro_edicion UNIQUE (id_edicion_externa),
    CHECK (total_paginas IS NULL OR (total_paginas BETWEEN 1 AND 100000 AND pagina_actual <= total_paginas))
);
CREATE TABLE autores_libro (
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    posicion INTEGER NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    PRIMARY KEY (libro_id, posicion)
);
CREATE TABLE registros_lectura (
    id UUID PRIMARY KEY,
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    pagina_anterior INTEGER NOT NULL CHECK (pagina_anterior >= 0),
    pagina_actual INTEGER NOT NULL CHECK (pagina_actual >= 0),
    nota VARCHAR(2000),
    creado_en TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    id_operacion UUID NOT NULL UNIQUE
);
CREATE TABLE operaciones (
    id UUID PRIMARY KEY,
    libro_id UUID NOT NULL,
    huella VARCHAR(64) NOT NULL,
    resultado CLOB NOT NULL
);
-- Serialización de escrituras de una única biblioteca, también entre procesos.
CREATE TABLE bloqueo_biblioteca (id INTEGER PRIMARY KEY);
INSERT INTO bloqueo_biblioteca (id) VALUES (1);
CREATE INDEX ix_libro_estado_actualizacion ON libros(estado, actualizado_en DESC, id DESC);
CREATE INDEX ix_libro_creacion ON libros(creado_en DESC, id DESC);
CREATE INDEX ix_registro_historial ON registros_lectura(libro_id, creado_en DESC, id DESC);
CREATE INDEX ix_autor_nombre ON autores_libro(nombre);
CREATE INDEX ix_operacion_libro ON operaciones(libro_id);
