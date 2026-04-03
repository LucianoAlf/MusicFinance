const { chromium } = require('playwright');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const email = 'codex.audit.1775213750071@example.com';
const password = 'Codex!1775213750071';
const screenshotPath = 'C:\\Users\\Texeira\\.codex\\tmp\\musicfinance-ui-audit-fail.png';
const stamp = Date.now();
const professorName = `Professor UI Audit ${stamp}`;
const studentName = `Aluno UI Audit ${stamp}`;
const instrumentName = `Violao UI Audit ${stamp}`;
const billName = `Conta UI Audit ${stamp}`;
const costCenterName = `Centro UI Audit ${stamp}`;
const expenseItemName = `Item UI Audit ${stamp}`;

function log(type, msg) {
  const line = `[${type}] ${msg}`;
  console.log(line);
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);

  page.on('console', (msg) => log(`console:${msg.type()}`, msg.text()));
  page.on('pageerror', (err) => log('pageerror', err.stack || err.message));
  page.on('requestfailed', (req) => log('requestfailed', `${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('supabase.co') || url.includes('music-finance.vercel.app')) {
      const status = res.status();
      if (
        status >= 400 ||
        /rest\/v1\/(schools|professors|students|payments|bills|expense_items|cost_centers)|auth\/v1\/token/.test(url)
      ) {
        log('response', `${status} ${res.request().method()} ${url}`);
      }
    }
  });

  try {
    log('step', 'goto login');
    await page.goto('https://music-finance.vercel.app', { waitUntil: 'domcontentloaded' });

    await page.getByPlaceholder('seu@email.com').fill(email);
    await page.getByPlaceholder('Sua senha').fill(password);
    log('step', 'submit login');
    await page.getByRole('button', { name: /Entrar no Sistema/i }).click();

    await page.waitForLoadState('networkidle');
    if (await page.getByRole('heading', { name: /Crie sua primeira escola|Nova escola/i }).count()) {
      log('step', 'create school');
      await page.getByPlaceholder('Ex: Escola de Musica Tom Jobim').fill('Codex UI Audit School');
      await page.getByRole('button', { name: /Criar escola/i }).click();
    }

    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Professores/i }).click();
    await page.getByRole('heading', { name: /Professores/i }).waitFor();

    log('step', 'open professor modal');
    await page.getByRole('button', { name: /Novo Professor/i }).click();
    await page.getByRole('heading', { name: /Novo Professor/i }).waitFor();
    await page.getByPlaceholder(/Ex:/i).fill(professorName);
    const newInstInput = page.getByPlaceholder('Novo instrumento...');
    await newInstInput.fill(instrumentName);
    await newInstInput.press('Enter');
    await page.getByText(instrumentName).waitFor();
    log('step', 'submit professor');
    await page.getByRole('button', { name: /^Cadastrar$/i }).click();
    await page.getByRole('heading', { name: /Novo Professor/i }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: professorName }).waitFor();

    log('step', 'open student modal');
    await page.getByRole('button', { name: /Novo Aluno/i }).click();
    await page.getByRole('heading', { name: /Novo Aluno/i }).waitFor();
    await page.getByPlaceholder('Ex: Ana Clara').fill(studentName);
    log('step', 'submit student');
    await page.getByRole('button', { name: /Cadastrar Aluno/i }).click();
    await page.getByRole('heading', { name: /Novo Aluno/i }).waitFor({ state: 'hidden' });
    await page.getByText(studentName, { exact: true }).first().waitFor();

    log('step', 'open payables');
    await page.getByRole('button', { name: /Contas a Pagar/i }).click();
    await page.getByRole('heading', { name: /Contas a Pagar/i }).waitFor();
    await page.getByRole('button', { name: /Nova Conta/i }).click();
    await page.getByRole('heading', { name: /Nova Conta a Pagar/i }).waitFor();
    await page.getByPlaceholder('Ex: Conta de Luz').fill(billName);
    await page.locator('button').filter({ hasText: 'dd/mm/aaaa' }).first().click();
    await page.getByRole('button', { name: /Hoje/i }).click();
    await page.locator('input[type="number"]').first().fill('199.90');
    await page.getByRole('button', { name: /\+ Novo Centro/i }).click();
    await page.getByPlaceholder('Ex: Pessoal, Admin...').fill(costCenterName);
    await page.getByRole('button', { name: /\+ Novo Item/i }).click();
    await page.getByPlaceholder('Ex: Aluguel, Salários...').fill(expenseItemName);
    log('step', 'submit bill');
    await page.getByRole('button', { name: /Confirmar Lançamento/i }).click();
    await page.getByRole('heading', { name: /Nova Conta a Pagar/i }).waitFor({ state: 'hidden' });
    await page.getByText(billName, { exact: true }).first().waitFor();

    log('result', 'SUCCESS');
  } catch (error) {
    log('result', `FAIL ${error?.message || error}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`SCREENSHOT=${screenshotPath}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
