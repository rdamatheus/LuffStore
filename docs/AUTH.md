# Autenticação — LUFF Admin

## Provedores

O painel aceita:

- Google OAuth;
- e-mail e senha, para contas que possuam senha configurada no Supabase Auth.

A conta owner atual foi criada pelo provedor Google, portanto o botão **Continuar com Google** é o fluxo principal para o administrador inicial.

## Autorização

Autenticação não concede acesso automaticamente ao painel. Após o login, a aplicação exige um vínculo ativo em `luff.members` para o tenant `luff-store`.

Papéis:

- `owner` — acesso administrativo completo;
- `manager` — catálogo e conteúdo;
- `staff` — consulta operacional.

## Redirect OAuth

O frontend calcula o retorno do Google para o diretório atual `/admin/`. Quando o domínio definitivo ou GitHub Pages for ativado, essa URL deve constar na lista de Redirect URLs permitidas em **Supabase Auth → URL Configuration**.

Nenhum segredo OAuth, `service_role` ou token administrativo fica no navegador.
