# LUFF Admin — Manual Operacional e Especificação Funcional

Versão: **0.3**  
Data: **2026-09-06**

## 1. Objetivo

O LUFF Admin é o painel operacional da presença digital da LUFF Store. Ele não substitui o ERP Velo. O papel do painel é organizar e operar a camada digital, editorial, de marketing, CRM, usuários, site e integração.

Princípio central:

> **Velo = fonte operacional de produto, preço, estoque e vendas. LUFF Admin = camada digital, editorial, comercial e de relacionamento.**

O sistema foi estruturado para funcionar agora sem a integração do Velo e receber os dados do ERP posteriormente sem reconstrução do painel.

---

## 2. Arquitetura

```text
GitHub Pages
  └── LUFF Admin
       ├── Supabase Auth
       ├── schema luff
       ├── RLS
       ├── Edge Function luff-admin-users
       └── futura integração Velo

Supabase compartilhado temporariamente
  ├── public         → Personal OS
  ├── luff           → LUFF Store
  └── luff_private   → funções internas LUFF
```

A LUFF não depende de tabelas de negócio do Personal OS. O compartilhamento atual é de infraestrutura, não de domínio de negócio.

---

## 3. Login e autenticação

### 3.1 Regra

O painel administrativo não possui cadastro público e não utiliza Google OAuth.

O acesso é exclusivamente por:

- e-mail;
- senha;
- usuário criado internamente;
- vínculo ativo em `luff.members`.

### 3.2 Fluxo correto

```text
/admin/
  ↓
E-mail + senha
  ↓
Supabase Auth valida credenciais
  ↓
LUFF verifica membership ativa
  ↓
LUFF identifica role
  ↓
/admin/#dashboard
```

O redirecionamento utiliza uma rota interna por hash. Isso permite atualizar o navegador sem perder a seção atual.

### 3.3 Falhas possíveis

- credencial inválida → mensagem na tela de login;
- usuário autenticado sem membership LUFF → sessão encerrada e acesso negado;
- membership suspensa → acesso negado;
- falha de carregamento do banco → erro operacional visível.

### 3.4 Correção do problema de tela parada

A versão anterior usava o atributo HTML `hidden`, mas o CSS do painel aplicava `display:grid` diretamente a `.login-shell` e `.app-shell`. Isso podia manter a tela de login visível mesmo após a autenticação.

A v0.3 adiciona regra explícita:

```css
[hidden] { display: none !important; }
```

Além disso, após autenticação e autorização o sistema navega explicitamente para `#dashboard`.

---

## 4. Perfis e permissões

### Owner

Pode:

- acessar todos os módulos;
- criar usuários internos;
- alterar roles e status;
- redefinir senha de usuários LUFF;
- administrar catálogo editorial;
- administrar site;
- administrar marketing;
- administrar clientes;
- ver indicadores;
- ver integrações;
- consultar logs de auditoria.

### Manager

Pode:

- administrar catálogo editorial;
- famílias e categorias;
- marcas;
- coleções;
- looks;
- site;
- marketing;
- clientes;
- visualizar indicadores;
- consultar equipe.

Não pode administrar usuários ou logs restritos do Owner.

### Staff

Pode consultar os módulos operacionais permitidos pelas políticas RLS. Não possui escrita administrativa.

### Segurança

A interface não é a camada final de autorização. As políticas RLS do banco validam o acesso independentemente do que o frontend exibir.

---

## 5. Dashboard

A tela **Visão geral** mostra o estado real da operação digital.

Indicadores atuais:

- quantidade de produtos;
- produtos publicados;
- categorias/subcategorias;
- clientes;
- campanhas;
- banners;
- coleções;
- looks;
- status de RLS/permissões;
- último indicador de vendas disponível.

Enquanto o Velo não estiver conectado, a área de vendas informa que ainda não existe sincronização.

---

## 6. Catálogo

### 6.1 Taxonomia

Estrutura:

```text
Família
  └── Categoria
       └── Subcategoria
```

Atributos como marca, cor, tamanho, material e ocasião não são categorias.

Operações:

- criar família;
- editar família;
- ativar/desativar;
- definir exibição no site;
- criar categoria;
- criar subcategoria;
- definir categoria-pai;
- ordenar;
- definir menu;
- definir destaque.

### 6.2 Produtos

Produtos comerciais não devem ser criados manualmente no LUFF Admin enquanto o Velo for a fonte oficial.

Campos protegidos pela regra operacional:

- SKU;
- código de barras;
- preço;
- estoque;
- variações;
- referência operacional.

Campos editáveis na camada LUFF:

- nome comercial;
- categoria;
- marca;
- descrição curta;
- descrição completa;
- imagem principal;
- SEO title;
- SEO description;
- publicação;
- destaque;
- novidade.

O painel lista produtos mesmo antes do enriquecimento digital e permite preparar a apresentação do item sem alterar os dados operacionais do ERP.

### 6.3 Marcas

Operações:

- criar;
- editar;
- slug;
- logo URL;
- descrição;
- ativar/desativar.

### 6.4 Atributos

Atributos iniciais:

- cor;
- tamanho de roupa por letras;
- tamanho de roupa numérico;
- tamanho de calçado;
- modelagem;
- material;
- ocasião.

A estrutura diferencia atributos de variação de atributos editoriais.

### 6.5 Coleções

Coleções são independentes das categorias.

Exemplos:

- Verão;
- Essenciais LUFF;
- Dia dos Pais;
- Novidades;
- Black Friday.

Operações:

- criar/editar;
- status;
- período;
- capa;
- publicação;
- selecionar múltiplos produtos.

### 6.6 Looks

Look é uma entidade própria.

Exemplo:

```text
Look Casual Noturno
  ├── camiseta
  ├── calça
  ├── tênis
  └── acessório
```

Operações:

- criar/editar;
- ocasião;
- descrição;
- capa;
- status;
- publicação;
- selecionar produtos do look.

---

## 7. Site

O módulo Site controla a apresentação pública da LUFF.

### Configurações

- nome da marca;
- slogan;
- WhatsApp;
- Instagram;
- endereço;
- mapa;
- SEO title;
- SEO description;
- status de publicação.

### Seções da Home

Estrutura inicial:

1. Novidades;
2. Destaques;
3. Looks;
4. Categorias.

### Banners

Operações:

- título;
- subtítulo;
- imagem;
- CTA;
- URL do CTA;
- ordem;
- período de exibição;
- ativo/inativo.

O conteúdo já nasce separado do código para permitir troca de campanha sem alterar HTML.

---

## 8. Marketing

### Campanhas

Campos:

- nome;
- objetivo;
- canal;
- status;
- início/fim;
- orçamento;
- observações.

Status:

```text
Rascunho
Planejado
Ativo
Pausado
Concluído
Arquivado
```

### Conteúdo

Fluxo:

```text
Ideia
  ↓
Planejado
  ↓
Produção
  ↓
Pronto
  ↓
Agendado
  ↓
Publicado
```

Tipos:

- post;
- reel;
- story;
- e-mail;
- WhatsApp;
- outros.

Cada conteúdo pode ser vinculado a uma campanha.

---

## 9. Clientes / CRM

O CRM foi preparado para operação manual agora e sincronização futura com o Velo.

Campos:

- nome;
- telefone;
- e-mail;
- aniversário;
- tamanho de roupa;
- tamanho de calça;
- tamanho de calçado;
- cores preferidas;
- estilos preferidos;
- observações;
- consentimento de marketing;
- última compra;
- origem do dado.

O consentimento de marketing é armazenado separadamente para suportar práticas de LGPD.

---

## 10. Indicadores

A tabela `luff.sales_daily` está preparada para receber sincronização do Velo.

Indicadores calculados pelo painel:

- venda líquida;
- pedidos;
- ticket médio;
- itens por pedido;
- clientes;
- histórico diário.

Regra:

> O painel não inventa métricas. Sem dados sincronizados, mostra estado vazio.

---

## 11. Integração Velo

Estado atual:

```text
provider: velo
status: not_configured
```

A integração futura deverá alimentar:

- produtos;
- referência;
- SKU;
- código de barras;
- variações;
- preço;
- preço promocional;
- estoque;
- clientes;
- vendas.

A comunicação não será acoplada diretamente à interface do ERP. Toda integração deverá passar pela camada de integração LUFF.

Campos preparados para mapeamento:

- `source_system`;
- `external_id`;
- `external_group_id`;
- `external_reference`;
- `last_synced_at`;
- `sync_status`;
- `integration_mappings`;
- `sync_runs`.

---

## 12. Gestão interna de usuários

Foi criada a Edge Function:

```text
luff-admin-users
```

Características:

- exige JWT válido;
- exige role `owner` ativa na LUFF;
- não expõe `service_role` ao navegador;
- permite listar usuários LUFF;
- criar usuário interno;
- editar role/status;
- definir nova senha;
- impede que o Owner atual remova o próprio acesso.

Não existe cadastro público.

---

## 13. Auditoria

Ações administrativas relevantes são registradas em `luff.audit_logs`.

Exemplos:

- criação de entidade;
- edição;
- associação de produtos;
- criação de usuário;
- mudança de papel;
- redefinição de senha.

Logs são visíveis somente ao Owner.

---

## 14. Banco de dados operacional

Entidades principais existentes:

```text
tenants
members
catalog_families
catalog_categories
brands
attributes
attribute_values
products
product_variants
product_attribute_values
variant_attribute_values
product_media
collections
collection_products
looks
look_items
site_settings
site_banners
site_sections
marketing_campaigns
marketing_content
customers
sales_daily
integration_connections
integration_mappings
sync_runs
audit_logs
```

---

## 15. Regras de consistência

1. O Velo será a fonte oficial de preço e estoque.
2. O painel LUFF não cria uma base paralela de produto comercial sem necessidade.
3. Dados editoriais pertencem à LUFF.
4. Marca não é categoria.
5. Coleção não é categoria.
6. Look não é categoria.
7. Usuários administrativos são criados internamente.
8. O navegador nunca recebe segredo administrativo.
9. Toda tabela sensível usa RLS.
10. Alterações importantes devem ser documentadas e versionadas.

---

## 16. Migração futura para Supabase próprio

Quando a LUFF precisar de um projeto Supabase separado:

1. criar novo projeto;
2. exportar schemas `luff` e `luff_private`;
3. migrar dados;
4. recriar RLS/grants;
5. migrar Edge Functions LUFF;
6. migrar Storage LUFF;
7. recriar segredos;
8. alterar URL/chave pública do frontend;
9. testar autenticação e integração;
10. remover dependência do projeto compartilhado.

A arquitetura atual foi desenhada para tornar essa extração previsível.

---

## 17. Critérios de aceitação da v0.3

A versão é considerada funcional quando:

- login e-mail/senha autentica;
- login autorizado abre `#dashboard`;
- tela de login desaparece após autenticação;
- refresh com sessão mantém o painel aberto;
- logout retorna ao login;
- navegação entre módulos funciona;
- taxonomia pode ser editada por Owner/Manager;
- camada digital de produtos pode ser editada;
- marcas, coleções e looks podem ser operados;
- site e banners podem ser operados;
- marketing pode ser operado;
- clientes podem ser operados;
- indicadores mostram dados reais ou estado vazio;
- Owner pode administrar usuários internos;
- Velo continua marcado como não configurado;
- logs permanecem restritos ao Owner;
- nenhum segredo é versionado no GitHub.

---

## 18. Próximas fases

Após validação da v0.3:

1. criar Storage LUFF para imagens;
2. ligar o site público às tabelas `site_*`, catálogo, coleções e looks;
3. homologar documentação/acesso do Velo;
4. implementar sincronização incremental e idempotente;
5. adicionar indicadores por produto/categoria;
6. evoluir CRM com histórico de compras;
7. adicionar futura camada de e-commerce sem reconstruir o catálogo.
