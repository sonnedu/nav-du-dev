export type Messages = {
  app: {
    bannerTitleDefault: string;
    adminTitleSuffix: string;
  };
  nav: {
    openMenu: string;
    toggleTheme: string;
    toggleSidebar: string;
    showSidebar: string;
    hideSidebar: string;
    backToTop: string;
    searchPlaceholder: string;
    currentTime: string;
  };
  admin: {
    login: string;
    logout: string;
    backHome: string;
    username: string;
    password: string;
    showPassword: string;
    hidePassword: string;
    loginFailed: string;
    currentlyCheckingAuth: string;

    links: string;
    add: string;
    addSiteTitle: string;
    editSiteTitle: string;
    categoriesAndGroups: string;
    import: string;
    export: string;
    reset: string;

    cancel: string;
    save: string;
    close: string;
    copy: string;
    apply: string;
    delete: string;

    icon: string;
    category: string;
    siteName: string;
    url: string;
    descriptionOptional: string;
    tagsOptional: string;

    categoriesGroupsTitle: string;
    group: string;
    noGroups: string;
    newGroupNamePlaceholder: string;
    categories: string;
    categoryNamePlaceholder: string;
    groupOptionalPlaceholder: string;
    orderPlaceholder: string;
    deleteCategory: string;
    linkCount: (n: number) => string;
    newCategory: string;
    addCategory: string;

    exportTitle: string;
    exportHint: string;
    importTitle: string;
    pasteJsonYaml: string;

    saveFailedNeedKv: string;
    resetFailedNeedKv: string;
    importSavedButFailed: string;

    confirmDeleteGroup: (g: string) => string;
    confirmDeleteCategoryWithLinks: (name: string, count: number) => string;
  };
};

export const zhCN: Messages = {
  app: {
    bannerTitleDefault: '我的收藏夹',
    adminTitleSuffix: '管理后台',
  },
  nav: {
    openMenu: '打开菜单',
    toggleTheme: '切换主题',
    toggleSidebar: '切换侧栏',
    showSidebar: '显示侧栏',
    hideSidebar: '隐藏侧栏',
    backToTop: '返回顶部',
    searchPlaceholder: '搜索名称 / 网址 / 描述（支持拼音与缩写）',
    currentTime: '当前时间',
  },
  admin: {
    login: '登录',
    logout: '退出登录',
    backHome: '返回首页',
    username: '账号',
    password: '密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    loginFailed: '登录失败',
    currentlyCheckingAuth: '正在检查登录状态…',

    links: '链接管理',
    add: '添加',
    addSiteTitle: '添加网站',
    editSiteTitle: '编辑网站',
    categoriesAndGroups: '分类/分组',
    import: '导入',
    export: '导出',
    reset: '重置',

    cancel: '取消',
    save: '保存',
    close: '关闭',
    copy: '复制',
    apply: '应用',
    delete: '删除',

    icon: '图标',
    category: '分类',
    siteName: '网站名称',
    url: '网址',
    descriptionOptional: '说明（可选）',
    tagsOptional: '标签（可选，逗号分隔）',

    categoriesGroupsTitle: '分类/分组管理',
    group: '分组',
    noGroups: '暂无分组',
    newGroupNamePlaceholder: '新分组名',
    categories: '分类',
    categoryNamePlaceholder: '分类名称',
    groupOptionalPlaceholder: '分组（可选）',
    orderPlaceholder: '排序',
    deleteCategory: '删除分类',
    linkCount: (n) => `当前链接数：${n}`,
    newCategory: '新增分类',
    addCategory: '添加分类',

    exportTitle: '导出配置（JSON）',
    exportHint: '复制后可保存到仓库或备份',
    importTitle: '导入配置（JSON 或 YAML）',
    pasteJsonYaml: '粘贴 JSON/YAML',

    saveFailedNeedKv: '保存失败：请确认 Pages Functions 与 KV 已配置',
    resetFailedNeedKv: '重置失败：请确认 Pages Functions 与 KV 已配置',
    importSavedButFailed: '导入成功但保存失败：请确认 Pages Functions 与 KV 已配置',

    confirmDeleteGroup: (g) => `确定删除分组「${g}」？该分组下分类将变为未分组。`,
    confirmDeleteCategoryWithLinks: (name, count) =>
      `分类「${name}」下仍有 ${count} 个链接，确定删除该分类并丢弃这些链接吗？`,
  },
};

export const en: Messages = {
  app: {
    bannerTitleDefault: 'My Bookmarks',
    adminTitleSuffix: 'Admin',
  },
  nav: {
    openMenu: 'Open menu',
    toggleTheme: 'Toggle theme',
    toggleSidebar: 'Toggle sidebar',
    showSidebar: 'Show sidebar',
    hideSidebar: 'Hide sidebar',
    backToTop: 'Back to top',
    searchPlaceholder: 'Search name / URL / description (pinyin supported)',
    currentTime: 'Current time',
  },
  admin: {
    login: 'Sign in',
    logout: 'Sign out',
    backHome: 'Back to home',
    username: 'Username',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    loginFailed: 'Login failed',
    currentlyCheckingAuth: 'Checking login status…',

    links: 'Links',
    add: 'Add',
    addSiteTitle: 'Add site',
    editSiteTitle: 'Edit site',
    categoriesAndGroups: 'Categories / Groups',
    import: 'Import',
    export: 'Export',
    reset: 'Reset',

    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    copy: 'Copy',
    apply: 'Apply',
    delete: 'Delete',

    icon: 'Icon',
    category: 'Category',
    siteName: 'Site name',
    url: 'URL',
    descriptionOptional: 'Description (optional)',
    tagsOptional: 'Tags (optional, comma separated)',

    categoriesGroupsTitle: 'Categories / Groups',
    group: 'Group',
    noGroups: 'No groups',
    newGroupNamePlaceholder: 'New group name',
    categories: 'Categories',
    categoryNamePlaceholder: 'Category name',
    groupOptionalPlaceholder: 'Group (optional)',
    orderPlaceholder: 'Order',
    deleteCategory: 'Delete category',
    linkCount: (n) => `Links: ${n}`,
    newCategory: 'New category',
    addCategory: 'Add category',

    exportTitle: 'Export config (JSON)',
    exportHint: 'Copy it to keep a backup',
    importTitle: 'Import config (JSON or YAML)',
    pasteJsonYaml: 'Paste JSON/YAML',

    saveFailedNeedKv: 'Save failed: please configure Pages Functions and KV',
    resetFailedNeedKv: 'Reset failed: please configure Pages Functions and KV',
    importSavedButFailed: 'Imported but failed to save: please configure Pages Functions and KV',

    confirmDeleteGroup: (g) => `Delete group "${g}"? Categories under it will become ungrouped.`,
    confirmDeleteCategoryWithLinks: (name, count) =>
      `Category "${name}" still has ${count} links. Delete it and discard those links?`,
  },
};
