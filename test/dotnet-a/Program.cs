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
                if(num < 0.8){
                    Console.WriteLine("It was a safe result!");
                } else {
                    Console.Error.WriteLine("It was a terrible result! " + (new Exception("Ahhhh! " + (DateTime.Now - DateTime.MinValue).TotalMilliseconds, new Exception("Fancy Inner Exception!!!!!\r\n(with newline!)"))).ToString());
                }
                await Task.Delay(100);
            }
        }
    }
}
