# Инструкция по сборке Android приложения с Firebase

Этот проект настроен для сборки нативного Android приложения с использованием Capacitor и GitHub Actions.

## Предварительные требования

1.  **Firebase Project**: Создайте проект в [Firebase Console](https://console.firebase.google.com/).
2.  **Android App**: В настройках проекта Firebase добавьте Android приложение с пакетом `com.videochat.app`.
3.  **google-services.json**: Скачайте файл `google-services.json` из настроек Firebase.

## Локальная настройка (рекомендуется)

Для корректной работы и тестирования рекомендуется выполнить первоначальную настройку локально:

1.  Установите зависимости:
    ```bash
    npm install
    ```
2.  Соберите веб-версию:
    ```bash
    npm run build
    ```
3.  Добавьте платформу Android:
    ```bash
    npx cap add android
    ```
4.  Скопируйте `google-services.json` в папку `android/app/`.
5.  Откройте проект в Android Studio:
    ```bash
    npx cap open android
    ```
6.  Запустите приложение на эмуляторе или устройстве.

## Настройка GitHub Actions

Для автоматической сборки APK через GitHub Actions выполните следующие шаги:

1.  **Подготовьте файл**: Откройте скачанный файл `google-services.json` и закодируйте его в **Base64**.
    *   **Mac/Linux**: выполните в терминале `base64 -i google-services.json`
    *   **Windows**: используйте онлайн-конвертер (например, [base64encode.org](https://www.base64encode.org/)) или PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))`
2.  Перейдите в ваш репозиторий на GitHub -> **Settings** -> **Secrets and variables** -> **Actions**.
3.  Нажмите **New repository secret**.
4.  В поле **Name** введите `GOOGLE_SERVICES_JSON`.
5.  В поле **Secret** вставьте полученную **Base64-строку** и сохраните.

Теперь при каждом пуше в ветку `main` будет запускаться сборка APK. Артефакт (APK файл) можно будет скачать в разделе **Actions** -> **Android Build** -> **Artifacts**.

## Push-уведомления и звонки

Для работы звонков при заблокированном экране используется Firebase Cloud Messaging (FCM).
В файле `src/utils/pushNotifications.ts` настроена базовая обработка уведомлений.
Для полноценной работы VoIP звонков на заблокированном экране может потребоваться дополнительная нативная настройка Android (ConnectionService), которую Capacitor поддерживает через плагины (например, `capacitor-callkeep`), но базовая настройка FCM уже включена.

Убедитесь, что ваш сервер отправляет push-уведомления с высоким приоритетом (`priority: 'high'`) и данными (`data`), чтобы пробудить устройство.
