
export type Language = 'en' | 'es';

export type TranslationSchema = {
    library: string;
    running: string;
    add_game: string;
    online: string;
    offline: string;
    settings: string;
    logout: string;
    setup_required: string;
    setup_desc: string;
    login_sync: string;
    logout_confirm_title: string;
    logout_confirm_msg: string;
    edit_settings: string;
    running_now: string;
    total_playtime: string;
    played_hours_mins: (h: number, m: number) => string;
    played_mins: (m: number) => string;
    current_session: string;
    last_session: string;
    history: string;
    no_history: string;
    add_new_game: string;
    create_custom_game: string;
    success: string;
    game_added: string;
    add_another: string;
    game_name: string;
    process_name: string;
    search_exe: string;
    hint_exe: string;
    add_custom_btn: string;
    dont_want_type: string;
    presets_desc: string;
    open_preset_lib: string;
    preset_lib_title: string;
    all_presets_added: string;
    close: string;
    edit_game_title: string;
    process_names_label: string;
    process_names_hint: string;
    save_changes: string;
    cancel: string;
    danger_zone: string;
    delete_game_btn: string;
    delete_game_hint: string;
    delete_confirm_title: (name: string) => string;
    delete_confirm_msg: (name: string) => string;
    settings_title: string;
    profile_section: string;
    updates_section: string;
    display_name: string;
    enter_name_placeholder: string;
    login_to_change: string;
    preferences_section: string;
    language_label: string;
    run_at_startup: string;
    run_at_startup_desc: string;
    minimize_tray: string;
    minimize_tray_desc: string;
    auto_sync: string;
    sync_now: string;
    settings_saved: string;
    sync_started: string;
    confirm: string;
    cancel_btn: string;
    check_updates: string;
    checking_updates: string;
    up_to_date: string;
    new_version_available: (v: string) => string;
    visit_github: string;
    update_error: string;
    login_title: string;
    signup_title: string;
    email_label: string;
    password_label: string;
    processing: string;
    no_account: string;
    have_account: string;
}

export const translations: Record<Language, TranslationSchema> = {
    en: {
        library: 'LIBRARY',
        running: 'RUNNING',
        add_game: '+ ADD GAME',
        online: 'Online',
        offline: 'Offline',
        settings: 'Settings',
        logout: 'Log Out',
        setup_required: 'SETUP REQUIRED',
        setup_desc: 'Setup .env details to enable sync',
        login_sync: 'LOGIN / SYNC',
        logout_confirm_title: 'Log Out',
        logout_confirm_msg: 'Are you sure you want to log out? Syncing will stop.',
        edit_settings: 'Edit Game Settings',
        running_now: '• RUNNING NOW',
        total_playtime: 'TOTAL PLAYTIME',
        played_hours_mins: (h: number, m: number) => `YOU HAVE PLAYED ${h} HOURS AND ${m} MINUTES`,
        played_mins: (m: number) => `YOU HAVE PLAYED ${m} MINUTES`,
        current_session: 'CURRENT SESSION',
        last_session: 'LAST SESSION',
        history: 'HISTORY',
        no_history: 'No history available for this game.',
        add_new_game: 'Add New Game',
        create_custom_game: 'CREATE CUSTOM GAME',
        success: 'SUCCESS!',
        game_added: 'Game added to your library.',
        add_another: 'Add Another',
        game_name: 'Game Name',
        process_name: 'Process Name (.exe)',
        search_exe: 'SEARCH .EXE',
        hint_exe: 'Hint: Select the game executable to fill this automatically.',
        add_custom_btn: 'ADD CUSTOM GAME',
        dont_want_type: "Don't want to type?",
        presets_desc: 'We have presets for Minecraft, Valorant, Terraria and more.',
        open_preset_lib: 'OPEN PRESET LIBRARY',
        preset_lib_title: 'Preset Library',
        all_presets_added: 'All recommended games are already in your library!',
        close: 'Close',
        edit_game_title: 'Edit Game',
        process_names_label: 'Process Names (comma separated)',
        process_names_hint: 'Add multiple .exe names if the game has different launchers.',
        save_changes: 'Save Changes',
        cancel: 'Cancel',
        danger_zone: 'Danger Zone',
        delete_game_btn: 'Delete Game',
        delete_game_hint: 'This will permanently remove the game definition and its playtime history.',
        delete_confirm_title: (name: string) => `Delete ${name}?`,
        delete_confirm_msg: (name: string) => `Are you sure you want to delete ${name}? All playtime history will be lost forever.`,
        settings_title: 'Settings',
        profile_section: 'Profile',
        updates_section: 'Updates',
        display_name: 'Display Name',
        enter_name_placeholder: 'Enter your username',
        login_to_change: 'Login to change',
        preferences_section: 'Preferences',
        language_label: 'Language',
        run_at_startup: 'Run at Startup',
        run_at_startup_desc: 'Launch the app automatically when you log in.',
        minimize_tray: 'Minimize to Tray',
        minimize_tray_desc: 'Keep running in background when closed.',
        auto_sync: 'Auto-Sync Data',
        sync_now: 'Sync Now',
        settings_saved: 'Settings saved!',
        sync_started: 'Sync started...',
        confirm: 'Confirm',
        cancel_btn: 'Cancel',

        // Updates
        check_updates: 'Check for Updates',
        checking_updates: 'Checking for updates...',
        up_to_date: 'You are on the latest version!',
        new_version_available: (v: string) => `New version available: ${v}!`,
        visit_github: 'Download from GitHub',
        update_error: 'Error checking for updates.',

        // Auth
        login_title: 'Login',
        signup_title: 'Sign Up',
        email_label: 'Email',
        password_label: 'Password',
        processing: 'Processing...',
        no_account: "Don't have an account? ",
        have_account: "Already have an account? "
    },
    es: {
        library: 'LIBRERÍA',
        running: 'CORRIENDO',
        add_game: '+ AÑADIR JUEGO',
        online: 'Conectado',
        offline: 'Desconectado',
        settings: 'Ajustes',
        logout: 'Cerrar Sesión',
        setup_required: 'CONFIGURACIÓN REQUERIDA',
        setup_desc: 'Configura los detalles del archivo .env para habilitar la sincronización',
        login_sync: 'INICIAR SESIÓN / SYNC',
        logout_confirm_title: 'Cerrar Sesión',
        logout_confirm_msg: '¿Estás seguro de que quieres cerrar sesión? La sincronización se detendrá.',
        edit_settings: 'Editar Ajustes del Juego',
        running_now: '• CORRIENDO AHORA',
        total_playtime: 'TIEMPO TOTAL',
        played_hours_mins: (h: number, m: number) => `HAS JUGADO ${h} HORAS Y ${m} MINUTOS`,
        played_mins: (m: number) => `HAS JUGADO ${m} MINUTOS`,
        current_session: 'SESIÓN ACTUAL',
        last_session: 'ÚLTIMA SESIÓN',
        history: 'HISTORIAL',
        no_history: 'No hay historial disponible para este juego.',
        add_new_game: 'Añadir Nuevo Juego',
        create_custom_game: 'CREAR JUEGO PERSONALIZADO',
        success: '¡ÉXITO!',
        game_added: 'Juego añadido a tu librería.',
        add_another: 'Añadir Otro',
        game_name: 'Nombre del Juego',
        process_name: 'Nombre del Proceso (.exe)',
        search_exe: 'BUSCAR .EXE',
        hint_exe: 'Consejo: Selecciona el ejecutable del juego para rellenar esto automáticamente.',
        add_custom_btn: 'AÑADIR JUEGO PERSONALIZADO',
        dont_want_type: "¿No quieres escribir?",
        presets_desc: 'Tenemos ajustes para Minecraft, Valorant, Terraria y más.',
        open_preset_lib: 'ABRIR LIBRERÍA DE PREDEFINIDOS',
        preset_lib_title: 'Juegos Predefinidos',
        all_presets_added: '¡Todos los juegos recomendados ya están en tu librería!',
        close: 'Cerrar',
        edit_game_title: 'Editar Juego',
        process_names_label: 'Nombres de Procesos (separados por coma)',
        process_names_hint: 'Añade varios nombres .exe si el juego tiene diferentes lanzadores.',
        save_changes: 'Guardar Cambios',
        cancel: 'Cancelar',
        danger_zone: 'Zona de Peligro',
        delete_game_btn: 'Eliminar Juego',
        delete_game_hint: 'Esto eliminará permanentemente la definición del juego y su historial de tiempo.',
        delete_confirm_title: (name: string) => `¿Eliminar ${name}?`,
        delete_confirm_msg: (name: string) => `¿Estás seguro de que quieres eliminar ${name}? Todo el historial se perderá para siempre.`,
        settings_title: 'Ajustes',
        profile_section: 'Perfil',
        updates_section: 'Actualizaciones',
        display_name: 'Nombre Visible',
        enter_name_placeholder: 'Ingresa tu nombre',
        login_to_change: 'Inicia sesión para cambiar',
        preferences_section: 'Preferencias',
        language_label: 'Idioma',
        run_at_startup: 'Ejecutar al iniciar PC',
        run_at_startup_desc: 'Lanza la aplicación automáticamente cuando inicias sesión.',
        minimize_tray: 'Minimizar a la bandeja',
        minimize_tray_desc: 'Seguir funcionando en segundo plano al cerrar.',
        auto_sync: 'Sincronización Automática',
        sync_now: 'Sincronizar Ahora',
        settings_saved: '¡Configuración guardada!',
        sync_started: 'Sincronización iniciada...',
        confirm: 'Confirmar',
        cancel_btn: 'Cancelar',

        // Updates
        check_updates: 'Buscar Actualizaciones',
        checking_updates: 'Buscando actualizaciones...',
        up_to_date: '¡Estás en la última versión!',
        new_version_available: (v: string) => `¡Nueva versión disponible: ${v}!`,
        visit_github: 'Descargar en GitHub',
        update_error: 'Error al buscar actualizaciones.',

        // Auth
        login_title: 'Iniciar Sesión',
        signup_title: 'Registrarse',
        email_label: 'Email',
        password_label: 'Contraseña',
        processing: 'Procesando...',
        no_account: "¿No tienes una cuenta? ",
        have_account: "¿Ya tienes una cuenta? "
    }
};

export function getTranslation(lang: Language): TranslationSchema {
    return translations[lang] || translations.en;
}
