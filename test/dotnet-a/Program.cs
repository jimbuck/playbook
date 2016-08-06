using System;
using System.Threading.Tasks;

namespace ConsoleApplication
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
            _doWork().Wait();
        }

        private static async Task _doWork()
        {
            var rand = new Random();
            while(true)
            {
                var num = rand.NextDouble();
                if(num < 0.9){
                    Console.WriteLine("It was a safe result!");
                } else {
                    Console.Error.WriteLine("It was a terrible result!");
                }
                await Task.Delay(100);
            }
        }
    }
}
