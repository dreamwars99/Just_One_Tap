using UnityEditor;
using UnityEditor.PackageManager;
using UnityEngine;

namespace J_O_T.Editor
{
    /// <summary>
    /// Unity 필수 패키지 설치를 위한 에디터 툴
    /// </summary>
    public class PackageInstaller
    {
        [MenuItem("Tools/J_O_T/Install Essential Packages")]
        public static void InstallEssentialPackages()
        {
            Debug.Log("📦 Requesting Vector Graphics & Localization Packages...");

            // Vector Graphics 패키지 설치 요청 (핵심 목표)
            Client.Add("com.unity.vectorgraphics");

            // Localization 패키지 설치 요청 (다국어 - 기 설치되었으면 스킵됨)
            Client.Add("com.unity.localization");

            Debug.Log("Check the 'Package Manager' window for progress.");
        }
    }
}
