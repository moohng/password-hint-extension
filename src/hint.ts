const GROUP_MAX_LENGTH = 10;

const ACCOUNT_MAX_LENGTH = 15;
const HINT_MAX_LENGTH = 15;

/**
 * 渲染密码提示列表
 * @param hints
 * @returns
 */
function renderHintItem(container: HTMLElement, hints?: { hint: string; account: string }[]) {
  const hintList =
    hints?.map((item, index) => {
      return `<div class="password-hint-item">
      <div class="hint-account">${item.account}</div>
      <div class="hint-content">${item.hint}</div>
      <div id="removePasswordHint" data-index="${index}">删除</div>
    </div>`;
    }) || [];
  const tpl = hintList.join('');
  container.querySelector('.password-hint-list')!.innerHTML = tpl;

  const hintsLength = hints?.length || 0;
  if (hintsLength >= GROUP_MAX_LENGTH) {
    container.querySelector<HTMLElement>('.password-hint-form')!.style.display = 'none';
  } else {
    container.querySelector<HTMLElement>('.password-hint-form')!.style.display = '';
  }
}

function initEvent(
  container: HTMLElement,
  hostname: string,
  passwordHints: { [key: string]: { hint: string; account: string }[] }
) {
  // 删除
  const passwordHintList = container.querySelector('.password-hint-list');
  passwordHintList!.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.id === 'removePasswordHint') {
      passwordHints[hostname].splice(parseInt(event.target.dataset.index!), 1);
      chrome.storage.sync.set({ passwordHints });
      renderHintItem(container, passwordHints[hostname]);
    }
  });

  const addPasswordHintButton = container.querySelector<HTMLButtonElement>('#addPasswordHint');

  const accountInput = container.querySelector<HTMLInputElement>('#account');
  const hintInput = container.querySelector<HTMLInputElement>('#hint');

  // 输入框变化
  [accountInput, hintInput].forEach((input) => {
    input!.addEventListener('input', () => {
      if (accountInput!.value && hintInput!.value) {
        addPasswordHintButton!.disabled = false;
      } else {
        addPasswordHintButton!.disabled = true;
      }
    });
  });

  // 添加
  addPasswordHintButton!.addEventListener('click', async () => {
    const currentPasswordHint = [
      ...(passwordHints[hostname] || []),
      { account: accountInput!.value, hint: hintInput!.value },
    ];
    passwordHints[hostname] = currentPasswordHint;
    await chrome.storage.sync.set({ passwordHints });

    renderHintItem(container, passwordHints[hostname]);
    accountInput!.value = '';
    hintInput!.value = '';
  });

  // 关闭
  const closePasswordHintManagerButton = container.querySelector<HTMLButtonElement>('#closePasswordHintManager');
  closePasswordHintManagerButton!.addEventListener('click', () => {
    console.log('close password hint manager', container);
    container.style.display = 'none';
  });
}

function createPasswordHintManager(hostname: string, hints?: { hint: string; account: string }[]) {
  const hintsLength = hints?.length || 0;

  const htmlTemplate = `
    <div class="password-hint">
      <div class="password-hint-title">
        <span class="hint-name">${hostname}（${hintsLength}）</span>
        <span id="closePasswordHintManager" class="hint-icon-close"></span>
      </div>
      <div class="password-hint-list"></div>
      <div class="password-hint-form">
        <input type="text" id="account" placeholder="账号分组" maxlength="${ACCOUNT_MAX_LENGTH}">
        <input type="text" id="hint" placeholder="密码提示信息（请勿输入密码）" maxlength="${HINT_MAX_LENGTH}">
        <button type="submit" id="addPasswordHint" disabled>添加</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.id = 'passwordHintManager';
  container.innerHTML = htmlTemplate;

  renderHintItem(container, hints);

  // 支持可拖拽
  new FastDraggable({
    el: container.firstElementChild! as HTMLElement,
    handle: '.hint-name',
    onDragEnd: () => {
      // container.classList.add('dragging');
    },
  });

  return container;
}

async function openPasswordHintManager({ hostname }: { hostname: string }) {
  const { passwordHints = {} } = await chrome.storage.sync.get('passwordHints');

  let container = document.querySelector<HTMLElement>('#passwordHintManager');
  if (!container) {
    container = createPasswordHintManager(hostname, passwordHints[hostname]);
    initEvent(container!, hostname, passwordHints);
    document.body.appendChild(container);
  } else {
    renderHintItem(container, passwordHints[hostname]);
    container.style.display = '';
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  console.log('message received', message);
  // 打开密码提示对话框
  if (message?.type === 'open-password-hint-dialog') {
    const url = new URL(message.info.pageUrl);
    openPasswordHintManager({ hostname: url.host });
  }
});

class FastDraggable {
  private el: HTMLElement;
  private handle: HTMLElement;
  private onDragBefore?: () => void;
  private onDragEnd?: () => void;
  private startX: number;
  private startY: number;
  private isDragging: boolean;
  private initX: number;
  private initY: number;

  constructor({
    el,
    handle,
    onDragBefore,
    onDragEnd,
  }: {
    el: HTMLElement | string;
    handle: string;
    onDragBefore?: () => void;
    onDragEnd?: () => void;
  }) {
    const elRef = typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el;
    if (!elRef) {
      throw new Error('Element not found');
    }
    const handleRef = elRef.querySelector<HTMLElement>(handle);
    if (!handleRef) {
      throw new Error('Handle not found');
    }

    this.handle = handleRef;
    this.handle.style.cursor = 'move';
    this.el = elRef;
    this.onDragBefore = onDragBefore;
    this.onDragEnd = onDragEnd;
    this.startX = 0;
    this.startY = 0;
    this.initX = 0;
    this.initY = 0;
    this.isDragging = false;

    this.handle.addEventListener('pointerdown', this.handleDown);
  }

  handleDown = (event: MouseEvent) => {
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;

    this.el.style.position = 'fixed';
    this.el.style.zIndex = '999999';
    this.el.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    this.initX = this.el.offsetLeft;
    this.initY = this.el.offsetTop;

    this.onDragBefore?.();

    document.addEventListener('pointermove', this.handleMove);
    document.addEventListener('pointerup', this.handleUp);
    document.addEventListener('pointercancel', this.handleUp);
  };

  handleMove = (event: MouseEvent) => {
    if (this.isDragging) {
      const x = event.clientX - this.startX;
      const y = event.clientY - this.startY;

      const left = this.initX + x;
      const top = this.initY + y;

      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    }
  };

  handleUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;

    this.el.style.position = '';
    this.el.style.zIndex = '';
    this.el.style.pointerEvents = '';
    document.body.style.userSelect = '';

    this.onDragEnd?.();

    document.removeEventListener('pointermove', this.handleMove);
    document.removeEventListener('pointerup', this.handleUp);
    document.removeEventListener('pointercancel', this.handleUp);
  };
}
