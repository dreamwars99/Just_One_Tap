using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 다국어 지원을 담당하는 매니저
    /// 시스템 언어 감지 및 런타임 언어 변경 기능 제공
    /// </summary>
    public class LocalizationManager : MonoBehaviour
    {
        private static LocalizationManager _instance;
        public static LocalizationManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject("LocalizationManager");
                    _instance = go.AddComponent<LocalizationManager>();
                }
                return _instance;
            }
        }

        private string _currentLanguage = "en";

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
        }

        private void Start()
        {
            // 시스템 언어 감지 및 자동 매칭
            DetectSystemLanguage();
        }

        /// <summary>
        /// 시스템 언어를 감지하여 지원 언어(En/Ko)로 자동 매칭합니다.
        /// </summary>
        private void DetectSystemLanguage()
        {
            // TODO: 시스템 언어 감지 로직 구현
        }

        /// <summary>
        /// 언어를 설정합니다.
        /// </summary>
        /// <param name="langCode">언어 코드 (예: "en", "ko")</param>
        public void SetLanguage(string langCode)
        {
            _currentLanguage = langCode;
            // TODO: 언어 변경 로직 구현
        }
    }
}