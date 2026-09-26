$env:ENVFILE = ".env.production"

Set-Location android
./gradlew assembleRelease -x :react-native-vision-camera:lintVitalAnalyzeRelease
Set-Location ..

Remove-Item Env:\ENVFILE -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "APK ready at: android\app\build\outputs\apk\release\app-release.apk"
