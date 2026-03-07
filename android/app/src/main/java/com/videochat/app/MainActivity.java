import android.telecom.PhoneAccount;
import android.telecom.TelecomManager;
import android.content.ComponentName;
import android.graphics.drawable.Icon;

private void registerPhoneAccount() {
    TelecomManager telecomManager = (TelecomManager) getSystemService(TELECOM_SERVICE);
    if (telecomManager == null) return;

    ComponentName componentName = new ComponentName(this, MyConnectionService.class);
    PhoneAccountHandle handle = new PhoneAccountHandle(componentName, "videochat_account"); // совпадает с твоим кодом

    PhoneAccount.Builder builder = PhoneAccount.builder(handle, "VideoChat App")
        .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
        .setIcon(Icon.createWithResource(this, R.drawable.ic_launcher)) // твой иконка
        .setShortDescription("Video calls");

    PhoneAccount phoneAccount = builder.build();

    try {
        telecomManager.registerPhoneAccount(phoneAccount);
        Log.d("MainActivity", "✅ PhoneAccount registered!");
    } catch (SecurityException e) {
        Log.e("MainActivity", "❌ Error registering PhoneAccount: " + e.getMessage());
    }
}
