// Regras de validação (funções puras, testáveis no navegador e no Node)
const MIN_SENHA = 6;

function validarNome(nome) {
  return typeof nome === "string" && nome.trim().length >= 3;
}

// Exatamente um "@", sem espaços, domínio com ponto e extensão
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarSenha(senha) {
  return typeof senha === "string" && senha.length >= MIN_SENHA && /\d/.test(senha);
}

function validarConfirmacao(senha, confirmacao) {
  return senha === confirmacao;
}


const CHAVE = "usuarios"; // localStorage guarda uma lista de usuários

function lerUsuarios() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch (e) { return []; }
}

// Regra de negócio separada da interface (facilita teste de integração)
function registrarUsuario(nome, email, senha, confirmar) {
  if (!validarNome(nome)) return { ok: false, campo: "nome", msg: "Nome obrigatório (mínimo 3 caracteres)." };
  if (!validarEmail(email)) return { ok: false, campo: "email", msg: "Formato de email inválido." };
  if (!validarSenha(senha)) return { ok: false, campo: "senha", msg: "Senha: mínimo " + MIN_SENHA + " caracteres e 1 número." };
  if (!validarConfirmacao(senha, confirmar)) return { ok: false, campo: "confirmar", msg: "As senhas não coincidem." };
  const usuarios = lerUsuarios();
  const emailNorm = email.trim().toLowerCase();
  if (usuarios.some(u => u.email === emailNorm)) return { ok: false, campo: "email", msg: "Este email já está cadastrado." };
  usuarios.push({ nome: nome.trim(), email: emailNorm, senha: senha });
  localStorage.setItem(CHAVE, JSON.stringify(usuarios));
  return { ok: true, msg: "Cadastro realizado com sucesso!" };
}

function autenticar(email, senha) {
  const emailNorm = (email || "").trim().toLowerCase();
  const u = lerUsuarios().find(x => x.email === emailNorm && x.senha === senha);
  return u ? { ok: true, usuario: u } : { ok: false, msg: "Email ou senha inválidos." };
}

/* ---------- Interface ---------- */
function mostrarMensagem(id, texto, cor) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.style.color = cor;
}

function mostrarAba(aba) {
  const cad = aba === "cadastro";
  document.getElementById("formCadastro").classList.toggle("oculto", !cad);
  document.getElementById("formLogin").classList.toggle("oculto", cad);
  document.getElementById("tabCadastro").classList.toggle("ativo", cad);
  document.getElementById("tabLogin").classList.toggle("ativo", !cad);
  document.getElementById("subtitulo").textContent = cad ? "Cadastro de Leitor" : "Acesso do Leitor";
}

function cadastrar() {
  const campos = ["nome", "email", "senha", "confirmar"];
  const v = {};
  campos.forEach(c => {
    v[c] = document.getElementById(c).value;
    document.getElementById(c).classList.remove("erro", "sucesso");
    document.getElementById("erro-" + c).textContent = "";
  });
  // valida todos os campos para destacar cada erro
  const regras = {
    nome: [validarNome(v.nome), "Nome obrigatório (mínimo 3 caracteres)."],
    email: [validarEmail(v.email), "Formato de email inválido."],
    senha: [validarSenha(v.senha), "Mínimo " + MIN_SENHA + " caracteres e 1 número."],
    confirmar: [validarConfirmacao(v.senha, v.confirmar) && v.confirmar !== "", "As senhas não coincidem."]
  };
  let valido = true;
  campos.forEach(c => {
    const input = document.getElementById(c);
    if (regras[c][0]) input.classList.add("sucesso");
    else { input.classList.add("erro"); document.getElementById("erro-" + c).textContent = regras[c][1]; valido = false; }
  });
  if (!valido) return mostrarMensagem("mensagem", "❌ Verifique os campos destacados!", "red");

  const r = registrarUsuario(v.nome, v.email, v.senha, v.confirmar);
  if (!r.ok) {
    document.getElementById(r.campo).classList.replace("sucesso", "erro");
    document.getElementById("erro-" + r.campo).textContent = r.msg;
    return mostrarMensagem("mensagem", "❌ " + r.msg, "red");
  }
  mostrarMensagem("mensagem", "✅ " + r.msg, "green");
}

function login() {
  const email = document.getElementById("loginEmail");
  const senha = document.getElementById("loginSenha");
  [email, senha].forEach(i => i.classList.remove("erro", "sucesso"));
  const r = autenticar(email.value, senha.value);
  if (!r.ok) {
    [email, senha].forEach(i => i.classList.add("erro"));
    return mostrarMensagem("mensagemLogin", "❌ " + r.msg, "red");
  }
  [email, senha].forEach(i => i.classList.add("sucesso"));
  mostrarMensagem("mensagemLogin", "✅ Bem-vindo(a), " + r.usuario.nome + "!", "green");
}

/* Testes automatizados (aparecem no Console do navegador - F12) */
(function () {
  const ls = localStorage.getItem("usuarios"); // preserva dados reais do usuário
  let falhas = 0;
  const ok = (cond, msg) => { if (!cond) { falhas++; } console.assert(cond, msg); };

  // Parte 2 - Unidade
  ok(validarEmail("teste@gmail.com") === true, "Email válido falhou");
  ok(validarEmail("teste@") === false, "Email inválido passou");
  ok(validarEmail("a@@b.com") === false, "Email com @@ passou");
  ok(validarNome("Maria") === true, "Nome válido falhou");
  ok(validarNome("Jo") === false, "Nome curto passou");
  ok(validarSenha("123456") === true, "Senha válida falhou");
  ok(validarSenha("abc") === false, "Senha inválida passou");
  ok(validarSenha("abcdef") === false, "Senha sem número passou");
  ok(validarConfirmacao("123456", "123") === false, "Confirmação diferente passou");

  // Parte 3 - Integração (cadastro -> localStorage -> login)
  localStorage.removeItem("usuarios");
  ok(registrarUsuario("Maria Silva", "maria@teste.com", "abc123", "abc123").ok === true, "Cadastro válido falhou");
  ok(JSON.parse(localStorage.getItem("usuarios")).length === 1, "Não salvou no localStorage");
  ok(autenticar("maria@teste.com", "abc123").ok === true, "Login válido falhou");
  ok(autenticar("maria@teste.com", "errada1").ok === false, "Login com senha errada passou");
  ok(autenticar("ninguem@teste.com", "abc123").ok === false, "Login de inexistente passou");
  ok(registrarUsuario("Maria 2", "MARIA@teste.com", "abc123", "abc123").ok === false, "Email duplicado passou");

  if (ls === null) localStorage.removeItem("usuarios"); else localStorage.setItem("usuarios", ls);
  console.log(falhas === 0 ? "✅ Testes OK!" : "❌ " + falhas + " teste(s) falharam");
})();