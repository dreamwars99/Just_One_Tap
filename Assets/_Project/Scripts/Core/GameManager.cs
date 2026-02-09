using UnityEngine;

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
                    GameObject go = new GameObject("GameManager");
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
}