# LUFF Admin v0.2

## Objetivo

Primeira versão funcional do painel administrativo da LUFF Store, com identidade própria da marca e conexão direta ao schema `luff` do Supabase.

## Decisões aplicadas

- LUFF continua com repositório GitHub próprio.
- Banco temporariamente compartilhado com o projeto Supabase `personal-os`.
- Separação lógica forte por schemas: `public` para Personal OS, `luff` para LUFF e `luff_private` para funções internas.
- `auth.users` é a única infraestrutura compartilhada de identidade.
- ERP Velo será a fonte operacional futura de produtos, preços, variações e estoque.
- O painel LUFF controla a camada editorial: taxonomia, marcas, coleções, looks, publicação, SEO e conteúdo.
- Nenhuma chave administrativa/service role é enviada ao navegador.

## Autorização

Papéis atuais:

- `owner`: administração completa, integrações e logs.
- `manager`: gestão de catálogo e conteúdo.
- `staff`: leitura operacional.

O usuário principal existente foi vinculado à LUFF como `owner` no banco. Esse vínculo não é hardcoded no código do frontend.

## Módulos implementados

### Visão geral

- métricas do catálogo;
- prontidão de publicação;
- status da integração Velo;
- status de taxonomia e segurança.

### Famílias e categorias

- visualização da árvore Família → Categoria → Subcategoria;
- criação e edição de famílias;
- criação e edição de categorias/subcategorias;
- controle de ativo/inativo;
- exibição no site;
- exibição no menu;
- destaque;
- ordenação.

### Produtos

- listagem preparada para produtos importados;
- busca local na listagem;
- categoria, marca, preço, status e origem;
- criação manual comercial bloqueada nesta fase para evitar divergência com o Velo.

### Marcas

- criação e edição;
- status ativo/inativo.

### Atributos

- leitura dos atributos e valores iniciais;
- distinção entre atributo de variação e atributo editorial.

### Coleções

- criação e edição;
- publicação no site;
- status.

### Looks

- criação e edição;
- ocasião;
- status;
- publicação.

### Integrações

- conector Velo visível;
- estado inicial `not_configured`;
- sem credenciais no frontend.

### Equipe

- leitura de membros e papéis;
- convites ainda não implementados, pois exigem backend seguro.

### Logs

- leitura para `owner`;
- registro de alterações administrativas relevantes.

## Módulos reservados para evolução

A navegação já possui espaços para:

- Site;
- Marketing;
- Clientes/CRM;
- Indicadores.

Esses módulos aparecem como planejados e ainda não gravam dados.

## Data API

O schema `luff` foi adicionado à lista de schemas expostos do PostgREST sem remover os schemas existentes:

`public, storage, graphql_public, luff`

O acesso continua protegido por grants + RLS.

## Chave usada no frontend

O frontend usa somente a chave `publishable` do Supabase, que é destinada a aplicações cliente e não concede bypass de RLS.

Regras:

- nunca usar `service_role` no browser;
- nunca versionar token do Velo;
- credenciais futuras do ERP devem ficar em Vault/secret de Edge Function ou backend equivalente;
- `integration_connections.config` deve conter apenas configuração não secreta.

## Validação de segurança executada

Foram simulados acessos com roles Postgres equivalentes a `anon` e `authenticated`.

Resultado para público (`anon`):

- 4 famílias visíveis;
- 9 categorias públicas visíveis;
- 0 produtos visíveis, pois ainda não há produtos publicados;
- tabelas administrativas permanecem indisponíveis.

Resultado para o usuário `owner` autenticado:

- 4 famílias visíveis;
- 93 categorias/subcategorias visíveis;
- 1 integração visível;
- teste de inserção protegido por RLS realizado dentro de transação e revertido com sucesso.

## Migrações Supabase relacionadas

- `20260906195757_create_luff_core_schema`
- `20260906195832_secure_luff_schema`
- `20260906195916_seed_luff_taxonomy_v1`
- `20260906195941_harden_luff_updated_at_function`
- `20260906200415_expose_luff_schema_to_data_api`
- `20260906201016_add_luff_product_attribute_values`

O histórico de migrações do próprio Supabase mantém o SQL aplicado. A partir desta fase, alterações novas devem continuar sendo registradas simultaneamente na documentação/repositório.

## Migração futura para projeto Supabase exclusivo

A LUFF foi desenhada para ser extraível. A migração futura deve copiar:

1. schemas `luff` e `luff_private`;
2. dados das tabelas LUFF;
3. políticas/grants;
4. usuários LUFF necessários do Auth ou novos vínculos de identidade;
5. Storage da LUFF quando criado;
6. secrets/Edge Functions da integração quando existirem.

Nenhuma tabela de negócio da LUFF depende de uma tabela `public` do Personal OS.
