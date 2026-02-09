using System.IO;
using System.Text;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace J_O_T.Editor
{
    /// <summary>
    /// Unity 필수 패키지 설치 및 다국어 기초 데이터(JSON) 생성을 위한 에디터 툴
    /// </summary>
    public class PackageInstaller
    {
        private static AddRequest _vectorGraphicsRequest;
        private static AddRequest _localizationRequest;

        [MenuItem("Tools/J_O_T/Install Packages & Data")]
        public static void InstallPackagesAndData()
        {
            Debug.Log("[PackageInstaller] 패키지 설치 및 데이터 생성을 시작합니다...");

            // 기능 1: 패키지 설치 요청
            InstallPackages();

            // 기능 2: JSON 파일 생성
            CreateLocalizationData();

            Debug.Log("[PackageInstaller] Packages Installing... Check Package Manager & JSON Files Created!");
        }

        /// <summary>
        /// Unity 필수 패키지를 설치 요청합니다.
        /// </summary>
        private static void InstallPackages()
        {
            // Vector Graphics 패키지 설치 요청
            _vectorGraphicsRequest = Client.Add("com.unity.vectorgraphics");
            Debug.Log("[PackageInstaller] Vector Graphics 패키지 설치 요청: com.unity.vectorgraphics");
            Debug.Log("[PackageInstaller] 패키지 설치 상태는 Package Manager 창에서 확인하세요.");

            // Localization 패키지 설치 요청
            _localizationRequest = Client.Add("com.unity.localization");
            Debug.Log("[PackageInstaller] Localization 패키지 설치 요청: com.unity.localization");
            Debug.Log("[PackageInstaller] 패키지 설치 상태는 Package Manager 창에서 확인하세요.");
        }

        /// <summary>
        /// 다국어 기초 데이터(JSON) 파일을 생성합니다.
        /// </summary>
        private static void CreateLocalizationData()
        {
            string localizationFolder = "Assets/_Project/Resources/Localization";

            // 폴더가 없으면 생성
            if (!Directory.Exists(localizationFolder))
            {
                Directory.CreateDirectory(localizationFolder);
                Debug.Log($"[PackageInstaller] 폴더 생성: {localizationFolder}");
            }

            // en.json 생성
            CreateJsonFile(Path.Combine(localizationFolder, "en.json"), GetEnglishJsonContent());

            // ko.json 생성
            CreateJsonFile(Path.Combine(localizationFolder, "ko.json"), GetKoreanJsonContent());

            // 에셋 데이터베이스 새로고침
            AssetDatabase.Refresh();
        }

        /// <summary>
        /// JSON 파일을 생성합니다. 기존 파일이 있으면 덮어쓰지 않습니다.
        /// </summary>
        /// <param name="filePath">파일 경로</param>
        /// <param name="content">JSON 내용</param>
        private static void CreateJsonFile(string filePath, string content)
        {
            if (File.Exists(filePath))
            {
                Debug.Log($"[PackageInstaller] JSON 파일 이미 존재: {filePath} (덮어쓰지 않음)");
                return;
            }

            // UTF-8 인코딩으로 파일 생성
            File.WriteAllText(filePath, content, new UTF8Encoding(false));
            Debug.Log($"[PackageInstaller] JSON 파일 생성: {filePath}");
        }

        /// <summary>
        /// 영어(English) JSON 파일 내용을 반환합니다.
        /// </summary>
        private static string GetEnglishJsonContent()
        {
            return @"{
  ""msg_ready"": ""Ready? Just One Tap."",
  ""msg_tap_to_save"": ""Tap to Save"",
  ""msg_see_you_tomorrow"": ""See you tomorrow"",
  ""msg_saved"": ""Saved!"",
  ""label_streak"": ""Streak"",
  ""label_points"": ""Points""
}";
        }

        /// <summary>
        /// 한국어(Korean) JSON 파일 내용을 반환합니다.
        /// </summary>
        private static string GetKoreanJsonContent()
        {
            return @"{
  ""msg_ready"": ""준비됐나요? Just One Tap."",
  ""msg_tap_to_save"": ""저축하기"",
  ""msg_see_you_tomorrow"": ""내일 만나요"",
  ""msg_saved"": ""저장 완료!"",
  ""label_streak"": ""연속"",
  ""label_points"": ""포인트""
}";
        }
    }
}
