# Changelog

## 2026-09-06 — Fundação LUFF v0.1

### Implementado

- repositório dedicado `rdamatheus/LuffStore`;
- documentação inicial do projeto;
- uso temporário do projeto Supabase `personal-os`, mantendo separação por schemas;
- schema `luff` para dados da LUFF;
- schema `luff_private` para funções internas;
- estrutura multi-tenant com `tenants` e `members`;
- papéis `owner`, `manager` e `staff`;
- catálogo com famílias, categorias, subcategorias, marcas, atributos, produtos, variações e mídia;
- coleções e looks;
- preparação para integração Velo;
- logs de sincronização e auditoria;
- RLS habilitado em todas as tabelas LUFF;
- permissões públicas limitadas ao catálogo publicado;
- taxonomia inicial de moda masculina;
- atributos iniciais de cor, tamanho, modelagem, material e ocasião.

### Dados iniciais

- 1 tenant: LUFF Store;
- 4 famílias;
- 93 categorias/subcategorias;
- 7 atributos;
- 53 valores de atributos;
- conexão Velo criada em estado `not_configured`.

### Validação

- todas as 19 tabelas do schema `luff` estão com RLS habilitado;
- o linter de segurança apontou inicialmente `search_path` mutável na função de atualização; corrigido em migração posterior;
- permanece um aviso global do projeto Supabase sobre proteção contra senhas vazadas desabilitada, não específico da LUFF.

### Pendências

- vincular o usuário owner da LUFF;
- configurar o schema `luff` como schema exposto na Data API quando o frontend for conectado;
- criar Storage de mídia da LUFF;
- construir painel administrativo;
- homologar API/integração do Velo em etapa posterior;
- ativar proteção contra senhas vazadas no Supabase quando disponível/configurado.
