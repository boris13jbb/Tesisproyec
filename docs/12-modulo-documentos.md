# Módulo — Registro documental (documentos)

## Objetivo

Ciclo de vida del expediente digital: registro, metadatos, estados, historial y vínculo con series y tipos.

## Alcance

CRUD acotado por permisos; trazabilidad de cambios relevantes.

## Estado actual

**No implementado.**

## Decisiones técnicas

- Transacciones al crear documento + metadatos; estados documentales como catálogo o enum según modelo.

## Pantallas

- Listado, creación, edición, detalle con historial.

## Tablas relacionadas

- Documento, metadatos, estados, FKs a catálogos.

## Dependencias

- Tipos documentales, series/subseries, usuarios, auditoría.
