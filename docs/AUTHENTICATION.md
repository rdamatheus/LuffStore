# Autenticação e provisionamento — LUFF Admin

## Princípio

O painel administrativo da LUFF não possui cadastro público e não oferece login social.

O acesso é restrito a usuários provisionados internamente pela administração.

## Fluxo permitido

1. um administrador autorizado cria ou provisiona a conta no Supabase Auth por um fluxo interno/seguro;
2. a conta é vinculada ao tenant `luff-store` em `luff.members`;
3. é atribuído um papel: `owner`, `manager` ou `staff`;
4. o usuário acessa o painel apenas com e-mail e senha;
5. as permissões continuam sendo verificadas no banco por RLS, não apenas na interface.

## Fluxos proibidos no painel

- cadastro público;
- `signUp` no frontend;
- login com Google;
- login com outros provedores sociais;
- criação automática de membro ao autenticar;
- elevação automática de papel;
- uso de `service_role` no navegador.

## Projeto Supabase compartilhado

A LUFF usa temporariamente o mesmo projeto Supabase do Personal OS.

Por isso, provedores de autenticação usados pelo Personal OS não devem ser desabilitados globalmente apenas por causa da LUFF. O isolamento da LUFF é feito no próprio aplicativo e pelas políticas de acesso do schema `luff`.

## Provisionamento futuro

A gestão de usuários deve ser implementada por backend/Edge Function com autorização de `owner`, usando credenciais administrativas somente no servidor. O frontend envia a solicitação, mas nunca recebe nem armazena chave `service_role`.

## Conta owner atual

A conta owner inicialmente vinculada ao tenant foi criada no projeto compartilhado usando Google. Como o painel LUFF agora aceita somente e-mail e senha, essa conta precisa receber uma credencial interna compatível ou ser substituída por uma conta administrativa interna específica da LUFF antes do uso operacional.
