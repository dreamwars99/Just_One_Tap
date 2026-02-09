using UnityEngine;

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
                    GameObject go = new GameObject("AuthManager");
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
}