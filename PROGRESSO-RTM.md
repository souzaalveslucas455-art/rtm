# Diário da migração do RTM para o Supabase e o GitHub do merch

## 05/11/2026

**Decisões aprovadas pelo Lucas**

- **Banco:** esquema separado `rtm` no Supabase do merch (kqpdledhaghuzuwjkvrf). A base de estabelecimentos e de clientes vai para uma pasta **privada** do Storage, e não para o GitHub, que é público.
- **GitHub:** repositório novo `rtm`.
  - Toda chave do app leva o prefixo `rtm_`.
  - O `sw.js` do RTM só apaga caches `rtm-`.
  - Pendente: uma linha no `sw.js` do merch, para ele apagar só os caches `merch-`. Vai junto com o go live; é mudança no merch e já tem o ok.
- **Logins:**
  - Os desenvolvedores entram com dc1@band.com.br, dc2 e dc3, cadastrados na tabela `rtm.desenvolvedores` e mantidos no painel do RTM. Sem portal e sem carga.
  - Senha padrão de 6 ou mais caracteres, só para o primeiro acesso. Depois, cada um cria a própria senha e um PIN de 4 números no celular.
  - O coordenador entra com a conta `admv.comercial` do merch.
  - As 3 contas são criadas antes, no Supabase, com Auto Confirm.
- **Regra de segurança:** nenhuma regra do RTM confia em "está logado". Toda regra confere a tabela de desenvolvedores ou a de coordenadores.

**Achados no merch (não alterados)**

- O cadastro de contas está aberto no projeto, e qualquer conta logada lê a pasta `fotos` inteira.
- `quem_chamar`, `calcular_referencia` e `recalcular_mix` aceitam qualquer conta logada.

**r01-esquema.sql entregue.** Cria 10 tabelas no esquema `rtm`, todas fechadas até o r02. Testado num banco montado com os scripts do merch (01 a 72 e o kit do portal):

- **Fora do `rtm`, nada mudou.** Esquema, dados, regras e permissões foram comparados antes e depois.
- **Rodar de novo para na trava** e não altera nada.
- **O 05 e o 30 do merch, rodados por cima, não alcançam o `rtm`.**
- **O acesso pela internet fica fechado**, sem login e com login.
- **O gatilho guarda a versão anterior** da visita só quando algo muda.
- **As travas de dado funcionam.** Elas barram:
  - CNPJ com pontos;
  - CNPJ repetido;
  - GPS impossível;
  - mensagem vazia;
  - e-mail em maiúsculas;
  - dois roteiros em uso;
  - recibo repetido.
- **Apagar uma publicação leva junto** o roteiro e os clientes próximos dela.
- **Sem a conta `admv.comercial`, a conferência avisa.**

**Próximos:** r02-seguranca (regras, primeiro acesso, funções do app e do painel) e r03-fotos.

**Contas dc1, dc2 e dc3 criadas pelo Lucas** no Supabase (Add user, com Auto Confirm).

**r02-seguranca.sql entregue.** Usa 17 funções; as tabelas continuam fechadas. O app e o painel só falam com o banco pelas funções, e cada função confere primeiro quem está chamando.

- **Funções do app:**
  - `quem_sou`: no 1º acesso, liga a conta ao cadastro pelo e-mail.
  - `trocar_minha_senha`
  - `sincronizar`: só o roteiro, os vizinhos e as mensagens daquele desenvolvedor.
  - `gravar_visitas`: tem as mesmas regras de "não apagar o já coletado" do Apps Script. O que não entra volta em `recusadas` e `avisos`.
  - `minhas_visitas`, `registrar_recibos`, `diagnostico`.
- **Funções do painel:**
  - `desenvolvedores_lista`, `desenvolvedor_salvar`
  - `voltar_senha_padrao`: a senha padrão é digitada na hora e não fica guardada.
  - `publicar_roteiro`: tudo ou nada. O plano passa a trazer `logins` na ordem de `devs`.
  - `roteiros`, `roteiro_completo`
  - `visitas_todas`: em páginas de 5.000.
  - `mensagem_gravar`, `mensagem_apagar`: apagar só esconde.
  - `mensagens_painel`
- **As respostas usam os mesmos nomes de campo do Apps Script.**
- **Ajustes em coisas do r01, todas dentro do `rtm`:**
  - A tabela de visitas e a de roteiro aceitam CNPJ com letras (o formato novo da Receita). O CNPJ é validado pelos dígitos verificadores, e o zero da frente perdido é completado.
  - O gatilho das visitas anteriores não dispara mais num reenvio idêntico.

**Para a fase do app e do painel:**
- O app e o painel não podem mais tirar as letras do CNPJ (o Apps Script fazia `replace(/\D/g, '')`).
- O painel lê as visitas em páginas, até `temMais` vir `false`.
- O plano publicado leva `logins`.

**Testado** num banco montado com os scripts do merch (01 a 72 e o kit do portal), com 12 grupos de teste:
- sem login;
- contas que não são do RTM (uma conta qualquer e um repositor do merch);
- 1º acesso e senha;
- coordenador e publicação com erro (nada entra);
- sincronização só com o que é do desenvolvedor;
- gravação, CNPJ ruim, reenvio incompleto e reenvio idêntico;
- separação entre desenvolvedores;
- mensagens, recibos e apagar;
- volta da senha padrão;
- desativado;
- diagnóstico;
- tabelas fechadas.

Resultados:
- 25 recusas, todas esperadas e com mensagem clara.
- Merch idêntico antes e depois.
- O r02 roda 2 vezes sem erro.
- O 05 e o 30 do merch não alcançam o `rtm`.

**Volume:**
- Publicar 4.500 clientes e 2.700 vizinhos: 0,6 s.
- Lote de 500 visitas: 0,4 s.
- Sincronizar com restauração: 0,3 s.
- Painel lendo 49.503 visitas em 10 páginas: 4 s no total, 0,43 s a página mais lenta, sem pular nem repetir nenhuma.
- Achado no teste: sem páginas, 50 mil visitas levavam 4,6 s e 46 MB numa resposta só. Corrigido com a leitura em páginas.

**Próximos:** expor o esquema `rtm` na Data API, depois o r03-fotos.

**r01 e r02 rodados no Supabase pelo Lucas.** A conferência do r02 bateu: 10 de 10, 17, 0, as 3 contas criadas, r02. Rodar o r01 de novo parou na trava, como esperado.

**r03-fotos.sql entregue.** Cria duas pastas privadas no Storage.

- **rtm-fotos** (até 2 MB, só imagem):
  - `visitas/<login>/<arquivo>`: o desenvolvedor envia e vê só a pasta dele.
  - `mensagens/<arquivo>`: o coordenador envia; todos os desenvolvedores ativos veem.
  - O coordenador vê tudo.
  - Foto não se troca nem se apaga.
- **rtm-base** (até 50 MB, JSON ou .gz): só o coordenador lê, envia e troca por uma versão nova.
- **Regras com nomes `rtm_`**, só para essas duas pastas. Uma função única, `rtm.storage_pode`, decide tudo.

**Testado:**
- O desenvolvedor não envia na pasta do outro, nem em mensagens, nem na base, nem com caminho `..` ou fora do padrão.
- Cada um vê só o que deve.
- O repositor do merch, uma conta qualquer e quem não está logado não veem nada do RTM. O repositor continua vendo a pasta `fotos` do merch como antes.
- Ninguém apaga. Só a base pode ser trocada, e só pelo coordenador.
- O desenvolvedor desativado perde o acesso.
- As regras do merch no Storage ficaram idênticas, e o resto do merch também.
- O r03 roda 2 vezes sem erro.
- Desempenho com 200 mil fotos do merch e 30 mil do RTM: o repositor abrindo uma loja leva 30 ms, contra 25 ms sem as regras do RTM.

**Para a fase do app:**
- Nome de foto único por envio.
- Se o reenvio der "já existe", tratar como enviado.
- `fotoCaminho` = `visitas/<login>/...`

**Pendente:** confirmar `rtm` em Exposed schemas (Data API).

**r03 rodado no Supabase pelo Lucas.** A conferência bateu: as duas pastas privadas (50 MB e 2 MB), 3 regras do RTM, `fotos_envia` e `fotos_le` do merch intactas, versão r03. O `rtm` foi acrescentado em Exposed schemas (Data API).

**Banco do RTM pronto.**

**Próxima etapa:** adaptar o app dos desenvolvedores para o Supabase, com:
- login, senha própria e PIN;
- `sincronizar` e `gravar_visitas` no lugar do Apps Script;
- fotos no `rtm-fotos`;
- chaves com o prefixo `rtm_` e `sw.js` próprio.

**Depois:**
1. o painel;
2. a importação do histórico da planilha;
3. desligar o Apps Script.

**App dos desenvolvedores 2.0.0 entregue** (pasta `rtm-app`: `index.html`, `sw.js`, `manifest.json` e dois ícones).

- **Login:**
  - Primeiro acesso: e-mail e senha padrão, depois a senha própria, depois o PIN de 4 números.
  - Dia a dia: só o PIN, inclusive sem sinal. Com 5 erros, o app pede a senha.
  - Sair apaga o PIN e a sessão.
- **Servidor:**
  - Funções `sincronizar`, `gravar_visitas`, `registrar_recibos`, `minhas_visitas` e `diagnostico`.
  - Só marca como enviada a visita que o servidor confirmou. A recusada sai da fila com um aviso.
- **Fotos:**
  - Vão para `rtm-fotos/visitas/<login>/<cnpj>_<momento>.jpg`, com nome fixo por foto. O reenvio recebe "já existe" e conta como enviado.
  - Depois que sobem, a cópia do aparelho é apagada.
  - Para exibir, o app usa um link assinado de 1 hora.
- **Carteira:** saiu do arquivo, porque eram 800 KB de PDVs com nome, telefone e endereço num repositório público. Agora chega pelo login, só a de cada um. O arquivo caiu de 978 KB para 163 KB.
- **Chaves e cache:**
  - Todas as chaves do app começam com `rtm_`.
  - O `sw.js` só cria e só apaga caches `rtm-`.
  - O manifesto e os ícones são arquivos de verdade, como o PWABuilder exige.
- **Defeito antigo corrigido:** os clientes da região sumiam ao reabrir o app (o roteiro guardado era aplicado antes de o estado existir).
- **Troca de desenvolvedor no mesmo aparelho:** bloqueada enquanto houver visita pendente. Liberada, apaga tudo do anterior.

**Testado:** 54 de 54, num navegador automático contra um Supabase simulado sobre o banco de teste (r01 a r03), repetido com a versão final.
- O teste achou dois defeitos, já corrigidos: a sessão de uma conta recusada ficava guardada, e o PIN contava um erro em dobro.

**Pendências:**
- **Antes de trocar o app nos celulares:** cada desenvolvedor envia tudo no app antigo. O endereço muda, e as visitas guardadas não migram sozinhas.
- **O app novo só serve para o campo depois que o painel publicar o roteiro no Supabase.** Próximo passo: o painel.
- As mensagens de erro do servidor aparecem sem acento (o SQL é sem acento).
- **Teste real do Lucas:** com a conta dc3. Depois, a senha do dc3 volta para a padrão por SQL.

**App renomeado para "Band Desenvolvedores" (versão 2.0.1).**

- **Onde o nome mudou:** título da página, nome no iPhone, manifesto (`name` e `short_name`), tela de entrada ("Band", com "DESENVOLVEDORES" embaixo) e origem do arquivo exportado.
- **Ícone:** passou de "DM" para "BD".
- **Versões:** `sw.js` vai para `rtm-2.0.1` (assim o celular baixa a versão nova), e o app para 2.0.1.
- **Testes:** os 54 testes passaram de novo.
