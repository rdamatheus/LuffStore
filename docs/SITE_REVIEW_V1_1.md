# LUFF Site Público — Revisão visual v1.1

Data: 2026-09-07

## Objetivo

Corrigir os principais problemas identificados na revisão visual da Home publicada: logo pequena, quebra inadequada do título, enquadramento do hero, repetição de imagens, uso indevido de imagem da loja em campanha, cards com imagens sem relação e excesso de aparência de protótipo.

## Ajustes aplicados

- logo horizontal recortada corretamente e com maior presença no cabeçalho e rodapé;
- hero com coluna de texto mais larga, título balanceado e sem linhas isoladas;
- enquadramento do hero padronizado para uma única fotografia;
- campanha de verão textual como fallback, sem reutilizar a foto da fachada;
- banners publicados pelo painel passam a substituir o fallback quando ativos;
- categorias só usam imagens explicitamente mapeadas ou `image_url` própria;
- categorias sem imagem adequada usam card tipográfico LUFF, evitando imagens erradas/repetidas;
- produtos publicados continuam vindo do Supabase e têm página individual;
- looks só exibem fotos quando houver looks reais publicados no painel;
- coleção e itens de coleção agora são carregados com `tenant_id`;
- todas as consultas públicas são filtradas pelo tenant LUFF;
- seção Sobre deixa de repetir fotografia já utilizada em outras áreas;
- botão flutuante continua com ícone, não texto `WA`;
- responsividade revisada para desktop, tablet e celular.

## Regra editorial

Uma mesma imagem não deve ser usada como fallback para categorias ou conteúdos semanticamente diferentes. Quando não existir uma imagem adequada, o site deve preferir um card tipográfico consistente com a identidade LUFF.

## Dados

O site permanece integrado ao schema `luff` do Supabase. Somente registros públicos/ativos permitidos pelas políticas RLS são exibidos.
