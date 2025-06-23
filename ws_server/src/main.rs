use futures_util::{StreamExt, SinkExt};
use serde::Serialize;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;

#[derive(Serialize)]
struct Data {
    bearing: f64,
    range: f64,
    stn: u32,
    category: u32,
    general_type: u32,
}

#[tokio::main]
async fn main() {
    let addr = "127.0.0.1:8085";
    let listener = TcpListener::bind(&addr)
        .await
        .expect("Failed to bind WebSocket server");
    println!("WebSocket server started on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(handle_connection(stream));
    }
}

async fn handle_connection(stream: tokio::net::TcpStream) {
    let addr = stream
        .peer_addr()
        .map(|a| a.to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    println!("Client connected: {}", addr);

    let ws_stream = accept_async(stream)
        .await
        .expect("Error during WebSocket handshake");

    let (mut write, _) = ws_stream.split();

    let mut stn = 1;

    loop {
        let data = Data {
            bearing: rand::random::<f64>() * 360.0,
            range: rand::random::<f64>() * 1000000000.0,
            stn,
            category: rand::random::<u32>() % 10,
            general_type: rand::random::<u32>() % 5,
        };

        let msg = serde_json::to_string(&data).unwrap();
        if let Err(e) = write.send(tokio_tungstenite::tungstenite::Message::Text(msg)).await {
            eprintln!("Error sending data to client: {}", e);
            break;
        }

        stn += 1;
        if stn > 10000 {
            stn = 1;
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    println!("Client disconnected: {}", addr);
}
