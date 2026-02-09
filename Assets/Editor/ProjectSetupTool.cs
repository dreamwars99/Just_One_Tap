using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace J_O_T.Editor
{
    /// <summary>
    /// 프로젝트 초기 설정을 위한 에디터 툴
    /// 폴더 구조와 핵심 매니저 스크립트를 자동 생성합니다.
    /// </summary>
    public class ProjectSetupTool : EditorWindow
    {
        [MenuItem("Tools/J_O_T/Initialize Project")]
        public static void InitializeProject()
        {
            Debug.Log("[ProjectSetupTool] 프로젝트 초기화를 시작합니다...");

            // 폴더 구조 생성
            CreateFolderStructure();

            // 매니저 스크립트 생성
            CreateManagerScripts();

            Debug.Log("J_O_T Project Initialized Successfully!");
            AssetDatabase.Refresh();
        }

        /// <summary>
        /// Tree.md에 정의된 폴더 구조를 생성합니다.
        /// </summary>
        private static void CreateFolderStructure()
        {
            string projectRoot = "Assets/_Project";

            // 폴더 구조 정의
            List<string> folders = new List<string>
            {
                // Art 폴더
                $"{projectRoot}/Art/Icons",
                $"{projectRoot}/Art/UI",
                $"{projectRoot}/Art/Fonts",

                // Resources 폴더
                $"{projectRoot}/Resources/Localization",

                // Scripts 폴더
                $"{projectRoot}/Scripts/Core",
                $"{projectRoot}/Scripts/UI",
                $"{projectRoot}/Scripts/Utils",

                // Scenes 폴더
                $"{projectRoot}/Scenes",

                // Prefabs 폴더
                $"{projectRoot}/Prefabs"
            };

            foreach (string folder in folders)
            {
                if (!Directory.Exists(folder))
                {
                    Directory.CreateDirectory(folder);
                    Debug.Log($"[ProjectSetupTool] 폴더 생성: {folder}");
                }
                else
                {
                    Debug.Log($"[ProjectSetupTool] 폴더 이미 존재: {folder}");
                }
            }
        }

        /// <summary>
        /// 핵심 매니저 스크립트를 생성합니다.
        /// </summary>
        private static void CreateManagerScripts()
        {
            string corePath = "Assets/_Project/Scripts/Core";

            // GameManager 생성
            CreateManagerScript(corePath, "GameManager.cs", GenerateGameManagerTemplate());

            // RoutineManager 생성
            CreateManagerScript(corePath, "RoutineManager.cs", GenerateRoutineManagerTemplate());

            // DataManager 생성
            CreateManagerScript(corePath, "DataManager.cs", GenerateDataManagerTemplate());

            // LocalizationManager 생성
            CreateManagerScript(corePath, "LocalizationManager.cs", GenerateLocalizationManagerTemplate());

            // AuthManager 생성
            CreateManagerScript(corePath, "AuthManager.cs", GenerateAuthManagerTemplate());
        }

        /// <summary>
        /// 매니저 스크립트 파일을 생성합니다. (이미 존재하면 건너뜀)
        /// </summary>
        private static void CreateManagerScript(string directory, string filename, string content)
        {
            string filePath = Path.Combine(directory, filename);

            if (File.Exists(filePath))
            {
                Debug.Log($"[ProjectSetupTool] 스크립트 이미 존재: {filePath}");
                return;
            }

            // UTF-8 인코딩으로 파일 생성
            File.WriteAllText(filePath, content, new UTF8Encoding(false));
            Debug.Log($"[ProjectSetupTool] 스크립트 생성: {filePath}");
        }

        /// <summary>
        /// GameManager 템플릿 코드 생성
        /// </summary>
        private static string GenerateGameManagerTemplate()
        {
            return @"using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 앱 전반의 상태를 관리하는 매니저
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        private static GameManager _instance;
        public static GameManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject(""GameManager"");
                    _instance = go.AddComponent<GameManager>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        /// <summary>
        /// 게임 상태 열거형
        /// </summary>
        public enum GameState
        {
            Intro,
            Main
        }

        [SerializeField] private GameState _currentState = GameState.Intro;

        public GameState CurrentState
        {
            get { return _currentState; }
            set { _currentState = value; }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            // 초기화 로직
        }
    }
}";
        }

        /// <summary>
        /// RoutineManager 템플릿 코드 생성
        /// </summary>
        private static string GenerateRoutineManagerTemplate()
        {
            return @"using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 핵심 루틴(One Tap) 및 스트릭(Streak) 로직을 처리하는 매니저
    /// </summary>
    public class RoutineManager : MonoBehaviour
    {
        private static RoutineManager _instance;
        public static RoutineManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject(""RoutineManager"");
                    _instance = go.AddComponent<RoutineManager>();
                }
                return _instance;
            }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
        }

        /// <summary>
        /// 오늘 루틴이 완료되었는지 확인합니다.
        /// </summary>
        /// <returns>오늘 완료 여부</returns>
        public bool IsTodayDone()
        {
            // TODO: 오늘 완료 여부 체크 로직 구현
            return false;
        }

        /// <summary>
        /// 루틴 액션을 시도합니다.
        /// </summary>
        public void TryRoutineAction()
        {
            // TODO: 루틴 액션 로직 구현
        }
    }
}";
        }

        /// <summary>
        /// DataManager 템플릿 코드 생성
        /// </summary>
        private static string GenerateDataManagerTemplate()
        {
            return @"using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 로컬(JSON) 및 클라우드(Firestore) 데이터 동기화를 담당하는 매니저
    /// </summary>
    public class DataManager : MonoBehaviour
    {
        private static DataManager _instance;
        public static DataManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject(""DataManager"");
                    _instance = go.AddComponent<DataManager>();
                }
                return _instance;
            }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
        }

        /// <summary>
        /// 데이터를 저장합니다.
        /// </summary>
        public void Save()
        {
            // TODO: 로컬 JSON 저장 및 Firestore 동기화 로직 구현
        }

        /// <summary>
        /// 데이터를 로드합니다.
        /// </summary>
        public void Load()
        {
            // TODO: 로컬 JSON 로드 및 Firestore 동기화 로직 구현
        }
    }
}";
        }

        /// <summary>
        /// LocalizationManager 템플릿 코드 생성
        /// </summary>
        private static string GenerateLocalizationManagerTemplate()
        {
            return @"using UnityEngine;

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
                    GameObject go = new GameObject(""LocalizationManager"");
                    _instance = go.AddComponent<LocalizationManager>();
                }
                return _instance;
            }
        }

        private string _currentLanguage = ""en"";

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
        /// <param name=""langCode"">언어 코드 (예: ""en"", ""ko"")</param>
        public void SetLanguage(string langCode)
        {
            _currentLanguage = langCode;
            // TODO: 언어 변경 로직 구현
        }
    }
}";
        }

        /// <summary>
        /// AuthManager 템플릿 코드 생성
        /// </summary>
        private static string GenerateAuthManagerTemplate()
        {
            return @"using UnityEngine;

namespace J_O_T.Core
{
    /// <summary>
    /// 소셜 로그인 및 인증을 관리하는 매니저
    /// </summary>
    public class AuthManager : MonoBehaviour
    {
        private static AuthManager _instance;
        public static AuthManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    GameObject go = new GameObject(""AuthManager"");
                    _instance = go.AddComponent<AuthManager>();
                }
                return _instance;
            }
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
        }

        /// <summary>
        /// 로그인을 수행합니다.
        /// </summary>
        public void Login()
        {
            // TODO: 소셜 로그인 로직 구현 (구글/애플)
        }

        /// <summary>
        /// 로그아웃을 수행합니다.
        /// </summary>
        public void Logout()
        {
            // TODO: 로그아웃 로직 구현
        }
    }
}";
        }
    }
}