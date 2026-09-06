# Changelog

## 2026-09-06 — LUFF Admin v0.2

### Implementado

- usuário principal vinculado à LUFF como `owner`;
- schema `luff` adicionado à Data API sem remover os schemas existentes;
- painel administrativo com identidade visual LUFF;
- autenticação usando Supabase Auth;
- autorização por papéis `owner`, `manager` e `staff`;
- dashboard com métricas e status da integração Velo;
- Central de Taxonomia com Famílias → Categorias → Subcategorias;
- criação e edição de famílias e categorias;
- listagem de produtos preparada para importação pelo Velo;
- cadastro e edição de marcas;
- visualização de atributos de moda;
- cadastro e edição de coleções;
- cadastro e edição de looks;
- tela de integração Velo em estado `not_configured`;
- tela de equipe;
- logs de auditoria restritos ao owner;
- módulos reservados para Site, Marketing, Clientes e Indicadores;
- chave `publishable` usada no frontend; nenhum segredo administrativo versionado;
- `.gitignore` para evitar versionamento acidental de arquivos de ambiente.

### Banco

- adicionada `luff.product_attribute_values` para atributos editoriais no nível do produto;
- RLS e grants aplicados à nova tabela;
- migração `expose_luff_schema_to_data_api` aplicada;
- migração `add_luff_product_attribute_values` aplicada.

### Validação

- teste RLS como `anon`: 4 famílias públicas, 9 categorias públicas e 0 produtos ainda publicados;
- teste RLS como usuário owner: 4 famílias, 93 categorias/subcategorias e integração Velo acessíveis;
- inserção temporária protegida por RLS testada em transação e revertida;
- schema exposto confirmado na configuração do role `authenticator` como `public, storage, graphql_public, luff`.

### Próximos passos

- validar o painel em navegador após publicação/preview;
- ativar o site público e conectar catálogo;
- criar Storage exclusivo para mídias da LUFF;
- implementar convite seguro de usuários por backend/Edge Function;
- homologar a integração Velo quando houver acesso ao ERP.

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

- configurar Storage de mídia da LUFF;
- homologar API/integração do Velo em etapa posterior;
- ativar proteção contra senhas vazadas no Supabase quando disponível/configurado.
