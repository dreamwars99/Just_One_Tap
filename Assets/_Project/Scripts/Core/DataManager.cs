using UnityEngine;

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
                    GameObject go = new GameObject("DataManager");
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
}